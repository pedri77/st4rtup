"""
Background Scheduler for Automated Tasks
Uses APScheduler to run automation tasks on schedule
"""
import logging
from datetime import datetime
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.events import EVENT_JOB_EXECUTED, EVENT_JOB_ERROR

from sqlalchemy import select

from app.core.config import settings
from app.core.database import AsyncSessionLocal

logger = logging.getLogger(__name__)

# Global scheduler instance
scheduler: AsyncIOScheduler = None


async def run_ac01_daily_summary():
    """
    AC-01: Daily Actions Summary
    Sends email summary of pending actions at 08:30 AM Europe/Madrid
    """
    from app.api.v1.endpoints.automation_tasks import get_daily_actions_summary, generate_daily_summary_html
    from app.services.email_service import email_service

    logger.info("🤖 Starting AC-01: Daily Actions Summary")

    try:
        async with AsyncSessionLocal() as db:
            # Get summary data
            summary = await get_daily_actions_summary(db)

            # Check if there are any actions
            if summary['total'] == 0:
                logger.info("ℹ️  AC-01: No pending actions, skipping email")
                return

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

            # Get recipient from system settings or config fallback
            from app.models import SystemSettings
            recipient_email = settings.EMAIL_FROM
            try:
                settings_result = await db.execute(select(SystemSettings).limit(1))
                system_settings = settings_result.scalar_one_or_none()
                if system_settings and system_settings.general_config:
                    configured_email = system_settings.general_config.get("notification_email")
                    if configured_email:
                        recipient_email = configured_email
            except Exception:
                pass  # Fall back to EMAIL_FROM

            result = await email_service.send_email(
                to=recipient_email,
                subject=f"📊 Resumen Diario de Acciones - {datetime.now().strftime('%d/%m/%Y')}",
                html_body=html_body,
                text_body=text_body,
                from_email=settings.EMAIL_FROM,
            )

            if result['success']:
                logger.info(f"✅ AC-01: Email sent successfully to {recipient_email}")
                logger.info(f"   Summary: {summary['total']} total ({len(summary['overdue'])} overdue, {len(summary['today'])} today, {len(summary['upcoming'])} upcoming)")
                logger.info(f"   Provider: {result['provider']}, Message ID: {result['message_id']}")
            else:
                logger.error(f"❌ AC-01: Failed to send email: {result['error']}")

    except Exception as e:
        logger.error(f"❌ AC-01: Error executing automation: {str(e)}", exc_info=True)


async def run_em01_day3_emails():
    """
    EM-01 Day 3: Welcome Sequence - Value Proposition
    Sends Day 3 email to leads created exactly 3 days ago
    Runs daily at 09:00 AM Europe/Madrid
    """
    from datetime import timezone, timedelta
    from sqlalchemy import select, func, and_
    from app.models import Lead, Email
    from app.api.v1.endpoints.automation_tasks import send_welcome_sequence_email

    logger.info("🤖 Starting EM-01 Day 3: Welcome Sequence scheduler")

    try:
        async with AsyncSessionLocal() as db:
            now = datetime.now(timezone.utc)
            three_days_ago = (now - timedelta(days=3)).date()

            # Find leads created exactly 3 days ago
            leads_query = select(Lead).where(
                func.date(Lead.created_at) == three_days_ago
            )
            result = await db.execute(leads_query)
            leads = result.scalars().all()

            if not leads:
                logger.info(f"ℹ️  EM-01 Day 3: No leads created on {three_days_ago}, skipping")
                return

            logger.info(f"📧 EM-01 Day 3: Found {len(leads)} leads created on {three_days_ago}")

            sent_count = 0
            skipped_count = 0

            for lead in leads:
                # Skip leads without email
                if not lead.contact_email:
                    skipped_count += 1
                    continue

                # Verify Day 0 was sent before sending Day 3
                day0_email = await db.execute(
                    select(Email).where(
                        and_(
                            Email.lead_id == lead.id,
                            Email.subject.like('%Bienvenid%'),
                            Email.status == "sent",
                        )
                    )
                )
                if not day0_email.scalar_one_or_none():
                    logger.info(f"  ⏭️  Lead {lead.company_name}: Day 0 not sent, skipping Day 3")
                    skipped_count += 1
                    continue

                # Check if Day 3 email was already sent
                existing_email = await db.execute(
                    select(Email).where(
                        and_(
                            Email.lead_id == lead.id,
                            Email.subject.like('%Casos de Uso Real%'),
                        )
                    )
                )
                if existing_email.scalar_one_or_none():
                    logger.info(f"  ⏭️  Lead {lead.company_name}: Day 3 email already sent, skipping")
                    skipped_count += 1
                    continue

                # Send Day 3 email
                try:
                    result = await send_welcome_sequence_email(db, str(lead.id), day=3)
                    if result['success']:
                        logger.info(f"  ✅ Lead {lead.company_name}: Day 3 email sent successfully")
                        sent_count += 1
                    else:
                        logger.error(f"  ❌ Lead {lead.company_name}: Failed to send Day 3 email: {result.get('error')}")
                except Exception as e:
                    logger.error(f"  ❌ Lead {lead.company_name}: Error sending Day 3 email: {str(e)}")

            logger.info(f"✅ EM-01 Day 3: Completed. Sent: {sent_count}, Skipped: {skipped_count}")

    except Exception as e:
        logger.error(f"❌ EM-01 Day 3: Error executing automation: {str(e)}", exc_info=True)


async def run_em01_day7_emails():
    """
    EM-01 Day 7: Welcome Sequence - Follow-up & CTA
    Sends Day 7 email to leads created exactly 7 days ago
    Runs daily at 09:15 AM Europe/Madrid
    """
    from datetime import timezone, timedelta
    from sqlalchemy import select, func, and_
    from app.models import Lead, Email
    from app.api.v1.endpoints.automation_tasks import send_welcome_sequence_email

    logger.info("🤖 Starting EM-01 Day 7: Welcome Sequence scheduler")

    try:
        async with AsyncSessionLocal() as db:
            now = datetime.now(timezone.utc)
            seven_days_ago = (now - timedelta(days=7)).date()

            # Find leads created exactly 7 days ago
            leads_query = select(Lead).where(
                func.date(Lead.created_at) == seven_days_ago
            )
            result = await db.execute(leads_query)
            leads = result.scalars().all()

            if not leads:
                logger.info(f"ℹ️  EM-01 Day 7: No leads created on {seven_days_ago}, skipping")
                return

            logger.info(f"📧 EM-01 Day 7: Found {len(leads)} leads created on {seven_days_ago}")

            sent_count = 0
            skipped_count = 0

            for lead in leads:
                # Skip leads without email
                if not lead.contact_email:
                    skipped_count += 1
                    continue

                # Verify Day 0 was sent before sending Day 7
                day0_email = await db.execute(
                    select(Email).where(
                        and_(
                            Email.lead_id == lead.id,
                            Email.subject.like('%Bienvenid%'),
                            Email.status == "sent",
                        )
                    )
                )
                if not day0_email.scalar_one_or_none():
                    logger.info(f"  ⏭️  Lead {lead.company_name}: Day 0 not sent, skipping Day 7")
                    skipped_count += 1
                    continue

                # Check if Day 7 email was already sent
                existing_email = await db.execute(
                    select(Email).where(
                        and_(
                            Email.lead_id == lead.id,
                            Email.subject.like('%Próximo Paso%'),
                        )
                    )
                )
                if existing_email.scalar_one_or_none():
                    logger.info(f"  ⏭️  Lead {lead.company_name}: Day 7 email already sent, skipping")
                    skipped_count += 1
                    continue

                # Send Day 7 email
                try:
                    result = await send_welcome_sequence_email(db, str(lead.id), day=7)
                    if result['success']:
                        logger.info(f"  ✅ Lead {lead.company_name}: Day 7 email sent successfully")
                        sent_count += 1
                    else:
                        logger.error(f"  ❌ Lead {lead.company_name}: Failed to send Day 7 email: {result.get('error')}")
                except Exception as e:
                    logger.error(f"  ❌ Lead {lead.company_name}: Error sending Day 7 email: {str(e)}")

            logger.info(f"✅ EM-01 Day 7: Completed. Sent: {sent_count}, Skipped: {skipped_count}")

    except Exception as e:
        logger.error(f"❌ EM-01 Day 7: Error executing automation: {str(e)}", exc_info=True)


async def run_scheduled_call_queues():
    """
    CALLS-Q: Procesa colas de llamadas programadas.
    Busca colas con scheduled_at <= now y status=pending, las inicia.
    También procesa colas running que tengan items pendientes.
    Runs every 2 minutes.
    """
    import asyncio
    from datetime import timezone as tz

    logger.debug("CALLS-Q: Checking for scheduled call queues")

    try:
        async with AsyncSessionLocal() as db:
            from sqlalchemy import and_
            from app.models.call import CallQueue

            now = datetime.now(tz.utc)

            # Buscar colas scheduled que deben arrancar
            result = await db.execute(
                select(CallQueue).where(and_(
                    CallQueue.status == "pending",
                    CallQueue.scheduled_at.isnot(None),
                    CallQueue.scheduled_at <= now,
                ))
            )
            scheduled_queues = result.scalars().all()

            for queue in scheduled_queues:
                logger.info("CALLS-Q: Starting scheduled queue '%s' (id=%s)", queue.name, queue.id)
                queue.status = "running"
                queue.started_at = now
                await db.commit()

                from app.services.call_queue_service import process_queue_items
                asyncio.create_task(process_queue_items(queue.id))

    except Exception as e:
        logger.error("CALLS-Q: Error: %s", str(e), exc_info=True)


async def run_slack_daily_digest():
    """Sends daily CRM summary to Slack channel."""
    from app.core.config import settings
    if not settings.SLACK_WEBHOOK_URL:
        return

    import httpx
    from datetime import timezone, timedelta
    from sqlalchemy import func
    from app.models import Lead, Action, ActionStatus, Opportunity, OpportunityStage

    async with AsyncSessionLocal() as db:
        now = datetime.now(timezone.utc)
        today = now.date()

        actions_overdue = (await db.execute(select(func.count(Action.id)).where(
            Action.due_date < today, Action.status.in_([ActionStatus.PENDING, ActionStatus.IN_PROGRESS])
        ))).scalar() or 0
        actions_today = (await db.execute(select(func.count(Action.id)).where(
            Action.due_date == today
        ))).scalar() or 0
        new_leads = (await db.execute(select(func.count(Lead.id)).where(
            func.date(Lead.created_at) == today - timedelta(days=1)
        ))).scalar() or 0
        pipeline = (await db.execute(select(func.coalesce(func.sum(Opportunity.value), 0)).where(
            Opportunity.stage.notin_([OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST])
        ))).scalar() or 0

        text = f"*Resumen diario St4rtup CRM* ({today.strftime('%d/%m/%Y')})\n\n"
        text += f"\u2022 Acciones hoy: *{actions_today}*\n"
        text += f"\u2022 Acciones vencidas: *{actions_overdue}*\n"
        text += f"\u2022 Leads nuevos ayer: *{new_leads}*\n"
        text += f"\u2022 Pipeline activo: *{pipeline:,.0f} EUR*\n"

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                await client.post(settings.SLACK_WEBHOOK_URL, json={"text": text})
            logger.info("Slack digest sent")
        except Exception as e:
            logger.error("Slack digest failed: %s", e)


def job_listener(event):
    """Log job execution events"""
    if event.exception:
        logger.error(f"❌ Job {event.job_id} failed: {event.exception}")
    else:
        logger.info(f"✅ Job {event.job_id} executed successfully")


def init_scheduler():
    """Initialize and configure the scheduler"""
    global scheduler

    if scheduler is not None:
        logger.warning("⚠️  Scheduler already initialized, skipping")
        return scheduler

    logger.info("🚀 Initializing automation scheduler...")

    # Create scheduler
    scheduler = AsyncIOScheduler(timezone='Europe/Madrid')

    # Add event listeners
    scheduler.add_listener(job_listener, EVENT_JOB_EXECUTED | EVENT_JOB_ERROR)

    # ─── AC-01: Daily Actions Summary ───────────────────────────────
    # Runs every day at 08:30 AM Europe/Madrid
    scheduler.add_job(
        run_ac01_daily_summary,
        trigger=CronTrigger(hour=8, minute=30, timezone='Europe/Madrid'),
        id='ac01_daily_summary',
        name='AC-01: Daily Actions Summary',
        replace_existing=True,
        misfire_grace_time=3600,  # Allow 1 hour grace period
    )
    logger.info("  ✓ AC-01: Daily Actions Summary (08:30 AM daily)")

    # ─── EM-01: Welcome Sequence Day 3 ──────────────────────────────
    # Runs every day at 09:00 AM Europe/Madrid
    scheduler.add_job(
        run_em01_day3_emails,
        trigger=CronTrigger(hour=9, minute=0, timezone='Europe/Madrid'),
        id='em01_day3_emails',
        name='EM-01 Day 3: Welcome Sequence',
        replace_existing=True,
        misfire_grace_time=3600,  # Allow 1 hour grace period
    )
    logger.info("  ✓ EM-01 Day 3: Welcome Sequence (09:00 AM daily)")

    # ─── EM-01: Welcome Sequence Day 7 ──────────────────────────────
    # Runs every day at 09:15 AM Europe/Madrid
    scheduler.add_job(
        run_em01_day7_emails,
        trigger=CronTrigger(hour=9, minute=15, timezone='Europe/Madrid'),
        id='em01_day7_emails',
        name='EM-01 Day 7: Welcome Sequence',
        replace_existing=True,
        misfire_grace_time=3600,  # Allow 1 hour grace period
    )
    logger.info("  ✓ EM-01 Day 7: Welcome Sequence (09:15 AM daily)")

    # ─── Slack Daily Digest ─────────────────────────────────────────
    scheduler.add_job(
        run_slack_daily_digest,
        trigger=CronTrigger(hour=8, minute=45, timezone='Europe/Madrid'),
        id='slack_daily_digest',
        name='Slack Daily Digest',
        replace_existing=True,
        misfire_grace_time=3600,
    )
    logger.info("  \u2713 Slack Daily Digest (08:45 AM daily)")

    # ─── CALLS-Q: Scheduled Call Queues ─────────────────────────────
    scheduler.add_job(
        run_scheduled_call_queues,
        trigger=CronTrigger(minute='*/2', timezone='Europe/Madrid'),
        id='calls_queue_processor',
        name='CALLS-Q: Process Scheduled Call Queues',
        replace_existing=True,
        misfire_grace_time=120,
    )
    logger.info("  ✓ CALLS-Q: Scheduled Call Queues (every 2 min)")

    # ─── Workflow Engine: event-driven scheduled jobs ───────────────
    from app.core.workflow_engine import register_scheduled_workflows
    register_scheduled_workflows(scheduler)

    logger.info("✅ Scheduler configured with active jobs:")
    for job in scheduler.get_jobs():
        logger.info(f"   • {job.name} (ID: {job.id})")
        next_run = getattr(job, 'next_run_time', None)
        if next_run:
            logger.info(f"     Next run: {next_run}")
        else:
            logger.info("     Next run: (will be computed on start)")

    return scheduler


def start_scheduler():
    """Start the scheduler"""
    global scheduler

    if scheduler is None:
        init_scheduler()

    if not scheduler.running:
        scheduler.start()
        logger.info("▶️  Scheduler started")
    else:
        logger.warning("⚠️  Scheduler already running")


def shutdown_scheduler():
    """Shutdown the scheduler gracefully"""
    global scheduler

    if scheduler and scheduler.running:
        scheduler.shutdown()
        logger.info("🛑 Scheduler shut down")
