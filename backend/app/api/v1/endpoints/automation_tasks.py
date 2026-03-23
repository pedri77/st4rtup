"""
Automation Task Endpoints - Execute automation logic
"""
from datetime import datetime, timezone, timedelta
import html as html_module
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import Dict, Any

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.permissions import require_write_access
from app.core.config import settings
from app.models import Action, ActionStatus, Lead
from app.services.email_service import email_service
from app.services.telegram_service import send_message as telegram_send_message

logger = __import__("logging").getLogger(__name__)

router = APIRouter()


async def _get_notification_recipient(db: AsyncSession, current_user: dict | None = None) -> str:
    """Obtiene el email del destinatario de notificaciones desde SystemSettings o fallback."""
    try:
        from app.models import SystemSettings
        result = await db.execute(select(SystemSettings).limit(1))
        system_settings = result.scalar_one_or_none()
        if system_settings and system_settings.general_config:
            recipient = system_settings.general_config.get("notification_email")
            if recipient:
                return recipient
    except Exception as e:
        import logging; logging.getLogger(__name__).debug("Settings lookup failed: %s", e)

    if current_user and current_user.get("email"):
        return current_user["email"]

    return settings.EMAIL_FROM


async def _check_active_welcome_sequence(db: AsyncSession, lead_id: str) -> bool:
    """Comprueba si un lead ya tiene una secuencia welcome activa (email enviado en últimos 10 días)."""
    from app.models import Email
    cutoff = datetime.now(timezone.utc) - timedelta(days=10)
    result = await db.execute(
        select(Email).where(
            and_(
                Email.lead_id == lead_id,
                Email.subject.like("%Bienvenid%"),
                Email.status == "sent",
                Email.sent_at >= cutoff,
            )
        )
    )
    return result.scalar_one_or_none() is not None


async def _send_telegram_summary(summary: Dict[str, Any]) -> bool:
    """Envía resumen de acciones por Telegram (degradación elegante si no está configurado)."""
    try:
        overdue_count = len(summary.get("overdue", []))
        today_count = len(summary.get("today", []))
        upcoming_count = len(summary.get("upcoming", []))
        total = summary.get("total", 0)

        message = (
            f"📊 *Resumen Diario de Acciones*\n\n"
            f"Total pendientes: *{total}*\n"
            f"🚨 Vencidas: *{overdue_count}*\n"
            f"⏰ Hoy: *{today_count}*\n"
            f"📅 Próximos 3 días: *{upcoming_count}*\n\n"
        )

        if overdue_count > 0:
            message += "⚠️ *Top acciones vencidas:*\n"
            for action in summary["overdue"][:5]:
                message += f"  • {action.get('company', '?')}: {action.get('description', '')[:50]}\n"

        await telegram_send_message(message)
        return True
    except Exception as e:
        logger.warning(f"Telegram notification failed (non-critical): {e}")
        return False


# ─── EM-01: Welcome Sequence ───────────────────────────────────────


async def send_welcome_sequence_email(
    db: AsyncSession,
    lead_id: str,
    day: int,  # 0, 3, or 7
) -> Dict[str, Any]:
    """
    Send a specific email from the welcome sequence
    """
    from app.models import Lead, Email
    from app.email_templates import (
        get_welcome_email_day0,
        get_welcome_email_day3,
        get_welcome_email_day7,
    )

    # Get lead
    lead_result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = lead_result.scalar_one_or_none()

    if not lead:
        return {"success": False, "error": "Lead not found"}

    # Prepare lead data for template
    lead_data = {
        "company": lead.company_name,
        "contact": lead.contact_name or lead.company_name,
        "sector": lead.company_sector or "tecnología",
        "regulatory_frameworks": lead.regulatory_frameworks if isinstance(lead.regulatory_frameworks, list) else [],
    }

    # Get template
    if day == 0:
        template = get_welcome_email_day0(lead_data)
    elif day == 3:
        template = get_welcome_email_day3(lead_data)
    elif day == 7:
        template = get_welcome_email_day7(lead_data)
    else:
        return {"success": False, "error": f"Invalid day: {day}"}

    # Create email record
    email = Email(
        lead_id=lead.id,
        to_email=lead.contact_email,
        from_email=settings.EMAIL_FROM,
        subject=template["subject"],
        body_html=template["html"],
        body_text=template["text"],
        status="draft",
        # Metadata to track sequence
        # Note: You might want to add a metadata JSON field to Email model
    )
    db.add(email)
    await db.commit()
    await db.refresh(email)

    # Send email
    result = await email_service.send_email(
        to=email.to_email,
        subject=email.subject,
        html_body=email.body_html,
        text_body=email.body_text,
        from_email=email.from_email,
    )

    if result['success']:
        email.status = "sent"
        email.sent_at = datetime.now(timezone.utc)
        email.resend_id = result['message_id']
        await db.commit()
        await db.refresh(email)

        return {
            "success": True,
            "email_id": str(email.id),
            "day": day,
            "provider": result['provider'],
            "message_id": result['message_id'],
        }
    else:
        email.status = "failed"
        await db.commit()
        return {
            "success": False,
            "error": result['error'],
            "day": day,
        }


@router.post("/EM-01/trigger/{lead_id}")
async def trigger_welcome_sequence(
    lead_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """
    EM-01: Trigger Welcome Sequence for a lead

    Sends 3 emails:
    - Day 0: Welcome and introduction (immediately)
    - Day 3: Value proposition and use cases (scheduled)
    - Day 7: Follow-up and CTA (scheduled)

    For now, this endpoint sends Day 0 immediately.
    Days 3 and 7 should be scheduled via the scheduler.
    """
    from app.models import Lead

    # Verify lead exists
    lead_result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = lead_result.scalar_one_or_none()

    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Check if lead already has active welcome sequence
    if await _check_active_welcome_sequence(db, lead_id):
        raise HTTPException(
            status_code=409,
            detail="Lead already has an active welcome sequence (email sent in last 10 days)"
        )

    # Send Day 0 email immediately
    result_day0 = await send_welcome_sequence_email(db, lead_id, day=0)

    if not result_day0['success']:
        raise HTTPException(
            status_code=500,
            detail="Failed to send Day 0 email"
        )

    # Day 3 and Day 7 are handled by the scheduler (run_em01_day3_emails, run_em01_day7_emails)
    # which run daily and pick up leads created 3 and 7 days ago respectively
    day3_scheduled = datetime.now(timezone.utc) + timedelta(days=3)
    day7_scheduled = datetime.now(timezone.utc) + timedelta(days=7)

    return {
        "success": True,
        "automation": "EM-01",
        "lead_id": lead_id,
        "lead_company": lead.company_name,
        "emails_sent": 1,
        "day0": result_day0,
        "day3_scheduled": day3_scheduled.isoformat(),
        "day7_scheduled": day7_scheduled.isoformat(),
        "message": "Welcome sequence started. Day 0 email sent. Days 3 and 7 scheduled via daily cron.",
    }


@router.post("/EM-01/send-day/{lead_id}/{day}")
async def send_specific_day_email(
    lead_id: str,
    day: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """
    Send a specific day email from the welcome sequence
    Useful for manual testing or recovery
    """
    if day not in [0, 3, 7]:
        raise HTTPException(status_code=400, detail="Day must be 0, 3, or 7")

    result = await send_welcome_sequence_email(db, lead_id, day=day)

    if not result['success']:
        raise HTTPException(status_code=500, detail=result['error'])

    return result


# ─── Scheduler Status ──────────────────────────────────────────────


@router.get("/scheduler/status")
async def get_scheduler_status(current_user: dict = Depends(get_current_user)):
    """
    Get scheduler status and upcoming jobs
    """
    from app.core.scheduler import scheduler

    if scheduler is None:
        return {
            "status": "not_initialized",
            "running": False,
            "jobs": [],
        }

    jobs_info = []
    for job in scheduler.get_jobs():
        jobs_info.append({
            "id": job.id,
            "name": job.name,
            "next_run_time": job.next_run_time.isoformat() if job.next_run_time else None,
            "trigger": str(job.trigger),
        })

    return {
        "status": "running" if scheduler.running else "stopped",
        "running": scheduler.running,
        "timezone": str(scheduler.timezone),
        "jobs": jobs_info,
        "total_jobs": len(jobs_info),
    }


# ─── AC-01: Resumen Diario de Acciones ────────────────────────────


async def get_daily_actions_summary(db: AsyncSession) -> Dict[str, Any]:
    """
    Get actions classified by urgency: overdue, today, upcoming (next 3 days)
    """
    now = datetime.now(timezone.utc)
    today = now.date()
    upcoming_end = today + timedelta(days=3)

    # Get all pending/in_progress actions
    query = select(Action).where(
        Action.status.in_([ActionStatus.PENDING, ActionStatus.IN_PROGRESS])
    ).order_by(Action.due_date.asc(), Action.priority.desc())

    result = await db.execute(query)
    actions = result.scalars().all()

    # Classify actions
    overdue_actions = []
    today_actions = []
    upcoming_actions = []

    for action in actions:
        if not action.due_date:
            continue

        # Get associated lead
        lead_result = await db.execute(select(Lead).where(Lead.id == action.lead_id))
        lead = lead_result.scalar_one_or_none()

        action_data = {
            "id": str(action.id),
            "type": action.action_type,
            "description": action.description,
            "due_date": action.due_date.isoformat(),
            "priority": action.priority.value if action.priority else "medium",
            "company": lead.company_name if lead else "Unknown",
            "lead_id": str(action.lead_id) if action.lead_id else None,
        }

        if action.due_date < today:
            # Overdue
            days_overdue = (today - action.due_date).days
            action_data["days_overdue"] = days_overdue
            overdue_actions.append(action_data)
        elif action.due_date == today:
            # Today
            today_actions.append(action_data)
        elif action.due_date <= upcoming_end:
            # Upcoming (next 3 days)
            action_data["days_until"] = (action.due_date - today).days
            upcoming_actions.append(action_data)

    return {
        "overdue": overdue_actions,
        "today": today_actions,
        "upcoming": upcoming_actions,
        "total": len(overdue_actions) + len(today_actions) + len(upcoming_actions),
        "generated_at": now.isoformat(),
    }


def generate_daily_summary_html(summary: Dict[str, Any]) -> str:
    """
    Generate professional HTML email template for daily actions summary
    """
    overdue = summary["overdue"]
    today = summary["today"]
    upcoming = summary["upcoming"]
    total = summary["total"]

    # Priority colors
    priority_colors = {
        "critical": "#DC2626",
        "high": "#EA580C",
        "medium": "#2563EB",
        "low": "#6B7280",
    }

    # Build overdue section
    overdue_html = ""
    if overdue:
        overdue_html = f"""
        <div style="margin-bottom: 30px;">
          <h2 style="color: #DC2626; font-size: 18px; margin-bottom: 15px; border-left: 4px solid #DC2626; padding-left: 12px;">
            🚨 Acciones Vencidas ({len(overdue)})
          </h2>
          <div style="background-color: #FEF2F2; border-radius: 8px; padding: 15px;">
        """
        for action in overdue:
            priority_color = priority_colors.get(action.get("priority", "medium"), "#6B7280")
            esc_company = html_module.escape(str(action['company']))
            esc_type = html_module.escape(str(action['type']))
            esc_desc = html_module.escape(str(action['description']))
            overdue_html += f"""
            <div style="background-color: white; border-radius: 6px; padding: 12px; margin-bottom: 10px; border-left: 3px solid {priority_color};">
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 6px;">
                <strong style="color: #1F2937; font-size: 14px;">{esc_company}</strong>
                <span style="background-color: #FEE2E2; color: #DC2626; font-size: 11px; padding: 3px 8px; border-radius: 12px; font-weight: 600;">
                  {action['days_overdue']} día{'s' if action['days_overdue'] > 1 else ''} de retraso
                </span>
              </div>
              <p style="color: #6B7280; font-size: 13px; margin: 0;">{esc_type}: {esc_desc}</p>
            </div>
            """
        overdue_html += "</div></div>"

    # Build today section
    today_html = ""
    if today:
        today_html = f"""
        <div style="margin-bottom: 30px;">
          <h2 style="color: #EA580C; font-size: 18px; margin-bottom: 15px; border-left: 4px solid #EA580C; padding-left: 12px;">
            ⏰ Acciones para Hoy ({len(today)})
          </h2>
          <div style="background-color: #FFF7ED; border-radius: 8px; padding: 15px;">
        """
        for action in today:
            priority_color = priority_colors.get(action.get("priority", "medium"), "#6B7280")
            esc_company = html_module.escape(str(action['company']))
            esc_type = html_module.escape(str(action['type']))
            esc_desc = html_module.escape(str(action['description']))
            today_html += f"""
            <div style="background-color: white; border-radius: 6px; padding: 12px; margin-bottom: 10px; border-left: 3px solid {priority_color};">
              <strong style="color: #1F2937; font-size: 14px; display: block; margin-bottom: 6px;">{esc_company}</strong>
              <p style="color: #6B7280; font-size: 13px; margin: 0;">{esc_type}: {esc_desc}</p>
            </div>
            """
        today_html += "</div></div>"

    # Build upcoming section
    upcoming_html = ""
    if upcoming:
        upcoming_html = f"""
        <div style="margin-bottom: 30px;">
          <h2 style="color: #2563EB; font-size: 18px; margin-bottom: 15px; border-left: 4px solid #2563EB; padding-left: 12px;">
            📅 Próximos 3 Días ({len(upcoming)})
          </h2>
          <div style="background-color: #EFF6FF; border-radius: 8px; padding: 15px;">
        """
        for action in upcoming:
            priority_color = priority_colors.get(action.get("priority", "medium"), "#6B7280")
            esc_company = html_module.escape(str(action['company']))
            esc_type = html_module.escape(str(action['type']))
            esc_desc = html_module.escape(str(action['description']))
            upcoming_html += f"""
            <div style="background-color: white; border-radius: 6px; padding: 12px; margin-bottom: 10px; border-left: 3px solid {priority_color};">
              <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 6px;">
                <strong style="color: #1F2937; font-size: 14px;">{esc_company}</strong>
                <span style="background-color: #DBEAFE; color: #2563EB; font-size: 11px; padding: 3px 8px; border-radius: 12px; font-weight: 600;">
                  En {action['days_until']} día{'s' if action['days_until'] > 1 else ''}
                </span>
              </div>
              <p style="color: #6B7280; font-size: 13px; margin: 0;">{esc_type}: {esc_desc}</p>
            </div>
            """
        upcoming_html += "</div></div>"

    # Build complete email
    html = f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Resumen Diario de Acciones</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F9FAFB; margin: 0; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">

        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667EEA 0%, #764BA2 100%); color: white; padding: 30px 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 700;">📊 Resumen Diario de Acciones</h1>
          <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 14px;">
            {datetime.now().strftime('%A, %d de %B de %Y')}
          </p>
        </div>

        <!-- Content -->
        <div style="padding: 30px 20px;">

          <!-- Summary Stats -->
          <div style="background-color: #F9FAFB; border-radius: 8px; padding: 20px; margin-bottom: 30px; text-align: center;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #6B7280;">Total de Acciones Pendientes</p>
            <p style="margin: 0; font-size: 42px; font-weight: 700; color: #1F2937;">{total}</p>
            <div style="display: flex; justify-content: space-around; margin-top: 15px; gap: 10px;">
              <div>
                <p style="margin: 0; font-size: 20px; font-weight: 600; color: #DC2626;">{len(overdue)}</p>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #6B7280;">Vencidas</p>
              </div>
              <div>
                <p style="margin: 0; font-size: 20px; font-weight: 600; color: #EA580C;">{len(today)}</p>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #6B7280;">Hoy</p>
              </div>
              <div>
                <p style="margin: 0; font-size: 20px; font-weight: 600; color: #2563EB;">{len(upcoming)}</p>
                <p style="margin: 4px 0 0 0; font-size: 12px; color: #6B7280;">Próximas</p>
              </div>
            </div>
          </div>

          <!-- Sections -->
          {overdue_html}
          {today_html}
          {upcoming_html}

          {'<p style="text-align: center; color: #9CA3AF; font-size: 14px; margin-top: 30px;">No hay acciones pendientes. ¡Buen trabajo! 🎉</p>' if total == 0 else ''}

        </div>

        <!-- Footer -->
        <div style="background-color: #F9FAFB; padding: 20px; text-align: center; border-top: 1px solid #E5E7EB;">
          <p style="margin: 0; font-size: 12px; color: #6B7280;">
            <strong>St4rtup CRM CRM</strong> • Automatización AC-01<br>
            Este resumen se genera automáticamente cada día a las 08:30
          </p>
        </div>

      </div>
    </body>
    </html>
    """

    return html


@router.post("/AC-01/execute")
async def execute_daily_summary(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """
    Execute AC-01: Daily Actions Summary

    Sends email summary of:
    - Overdue actions
    - Actions due today
    - Actions in next 3 days
    """
    # Get summary data
    summary = await get_daily_actions_summary(db)

    # Generate HTML email
    html_body = generate_daily_summary_html(summary)

    # Generate plain text version
    text_body = f"""
    RESUMEN DIARIO DE ACCIONES
    {datetime.now().strftime('%d/%m/%Y')}

    Total: {summary['total']} acciones pendientes
    - Vencidas: {len(summary['overdue'])}
    - Hoy: {len(summary['today'])}
    - Próximos 3 días: {len(summary['upcoming'])}

    Revisa el email HTML para ver los detalles completos.

    ---
    St4rtup CRM CRM - Automatización AC-01
    """

    # Get recipient from system settings, user email, or config fallback
    recipient_email = await _get_notification_recipient(db, current_user)

    result = await email_service.send_email(
        to=recipient_email,
        subject=f"📊 Resumen Diario de Acciones - {datetime.now().strftime('%d/%m/%Y')}",
        html_body=html_body,
        text_body=text_body,
        from_email=settings.EMAIL_FROM,
    )

    if not result['success']:
        raise HTTPException(
            status_code=500,
            detail="Failed to send email"
        )

    # Send Telegram notification (graceful degradation if not configured)
    telegram_sent = await _send_telegram_summary(summary)

    return {
        "success": True,
        "automation": "AC-01",
        "summary": {
            "total": summary['total'],
            "overdue": len(summary['overdue']),
            "today": len(summary['today']),
            "upcoming": len(summary['upcoming']),
        },
        "email_sent": True,
        "email_provider": result['provider'],
        "message_id": result['message_id'],
        "telegram_sent": telegram_sent,
    }


@router.get("/AC-01/preview")
async def preview_daily_summary(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Preview the daily summary without sending email.
    Returns the HTML that would be sent.
    """
    summary = await get_daily_actions_summary(db)
    html_body = generate_daily_summary_html(summary)

    return {
        "summary": summary,
        "html_preview": html_body,
    }
