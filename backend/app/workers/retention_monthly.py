"""Monthly retention email worker for st4rtup.

Run via cron (1st of month) or manual trigger.
Sends usage summary + CTA to active subscribers.
"""
import asyncio
import logging
import os
from datetime import datetime, timezone, timedelta

import httpx
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

BREVO_API_KEY = os.getenv("BREVO_API_KEY", "")
SENDER = {"name": "st4rtup", "email": "info@st4rtup.com"}


async def send_retention_email(
    email: str,
    name: str,
    plan: str,
    stats: dict,
):
    """Send monthly usage summary email via Brevo."""
    if not BREVO_API_KEY:
        logger.warning("BREVO_API_KEY not set, skipping retention email")
        return

    display = name or email.split("@")[0]
    leads = stats.get("leads", 0)
    deals = stats.get("deals", 0)
    emails_sent = stats.get("emails_sent", 0)
    month_label = stats.get("month", datetime.now(timezone.utc).strftime("%B %Y"))

    html = f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0F172A;font-family:'Plus Jakarta Sans',system-ui,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0F172A;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#1E293B;border-radius:12px;overflow:hidden;">
  <tr><td style="background:linear-gradient(135deg,#1E6FD9,#1447A0);padding:32px 40px;text-align:center;">
    <h1 style="color:#FFFFFF;font-size:28px;margin:0;">st4rtup</h1>
    <p style="color:#93C5FD;font-size:14px;margin:8px 0 0;">Tu resumen mensual</p>
  </td></tr>
  <tr><td style="padding:40px;">
    <h2 style="color:#F1F5F9;font-size:22px;margin:0 0 8px;">Hola, {display}</h2>
    <p style="color:#94A3B8;font-size:15px;line-height:1.6;margin:0 0 24px;">
      Aqui tienes tu actividad de <strong style="color:#60A5FA;">{month_label}</strong>
      en el plan <strong style="color:#60A5FA;">{plan.capitalize()}</strong>.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
      <tr>
        <td width="33%" style="text-align:center;padding:20px 8px;background:#0F172A;border-radius:8px;">
          <p style="color:#1E6FD9;font-size:32px;font-weight:700;margin:0;">{leads}</p>
          <p style="color:#94A3B8;font-size:13px;margin:4px 0 0;">Leads</p>
        </td>
        <td width="8"></td>
        <td width="33%" style="text-align:center;padding:20px 8px;background:#0F172A;border-radius:8px;">
          <p style="color:#1E6FD9;font-size:32px;font-weight:700;margin:0;">{deals}</p>
          <p style="color:#94A3B8;font-size:13px;margin:4px 0 0;">Deals</p>
        </td>
        <td width="8"></td>
        <td width="33%" style="text-align:center;padding:20px 8px;background:#0F172A;border-radius:8px;">
          <p style="color:#1E6FD9;font-size:32px;font-weight:700;margin:0;">{emails_sent}</p>
          <p style="color:#94A3B8;font-size:13px;margin:4px 0 0;">Emails enviados</p>
        </td>
      </tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
      <tr><td style="padding:16px;background:#0F172A;border-radius:8px;border-left:3px solid #1E6FD9;">
        <p style="color:#60A5FA;font-size:13px;font-weight:600;margin:0 0 4px;">Tu plan {plan.capitalize()} incluye</p>
        <p style="color:#CBD5E1;font-size:14px;line-height:1.6;margin:0;">
          Pipeline ilimitado, secuencias de email, integraciones, reportes avanzados y soporte prioritario.
        </p>
      </td></tr>
    </table>
    <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
      <tr><td style="background:#1E6FD9;border-radius:8px;padding:14px 32px;">
        <a href="https://st4rtup.com/app" style="color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:600;">Ver mi dashboard</a>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:24px 40px;background:#0F172A;text-align:center;">
    <p style="color:#475569;font-size:12px;margin:0;">st4rtup.com | info@st4rtup.com</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>"""

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                "https://api.brevo.com/v3/smtp/email",
                headers={"api-key": BREVO_API_KEY, "Content-Type": "application/json"},
                json={
                    "sender": SENDER,
                    "to": [{"email": email}],
                    "subject": f"Tu resumen de {month_label} en st4rtup",
                    "htmlContent": html,
                },
            )
            logger.info(f"Retention email sent to {email}: {resp.status_code}")
    except Exception as e:
        logger.error(f"Failed to send retention email to {email}: {e}")


async def run_monthly_retention(db: AsyncSession):
    """Query active subscribers and send retention emails.

    Call from a cron job or scheduled task on the 1st of each month.
    """
    from app.models.subscription import Subscription

    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    prev_month_start = (month_start - timedelta(days=1)).replace(day=1)
    month_label = prev_month_start.strftime("%B %Y")

    result = await db.execute(
        select(Subscription).where(Subscription.status.in_(["active", "trialing"]))
    )
    subs = result.scalars().all()

    for sub in subs:
        user_id = str(sub.user_id)

        # Gather stats for previous month
        stats = {"leads": 0, "deals": 0, "emails_sent": 0, "month": month_label}
        try:
            from app.models.lead import Lead

            lead_count = await db.execute(
                select(func.count(Lead.id)).where(
                    Lead.user_id == user_id,
                    Lead.created_at >= prev_month_start,
                    Lead.created_at < month_start,
                )
            )
            stats["leads"] = lead_count.scalar() or 0
        except Exception:
            pass

        try:
            from app.models.pipeline import Opportunity

            deal_count = await db.execute(
                select(func.count(Opportunity.id)).where(
                    Opportunity.user_id == user_id,
                    Opportunity.created_at >= prev_month_start,
                    Opportunity.created_at < month_start,
                )
            )
            stats["deals"] = deal_count.scalar() or 0
        except Exception:
            pass

        try:
            from app.models.crm import Email

            email_count = await db.execute(
                select(func.count(Email.id)).where(
                    Email.user_id == user_id,
                    Email.created_at >= prev_month_start,
                    Email.created_at < month_start,
                )
            )
            stats["emails_sent"] = email_count.scalar() or 0
        except Exception:
            pass

        # Get user email (from User model or subscription metadata)
        try:
            from app.models.user import User

            user = await db.get(User, user_id)
            if user and user.email:
                await send_retention_email(
                    email=user.email,
                    name=user.full_name or "",
                    plan=sub.plan or "growth",
                    stats=stats,
                )
        except Exception as e:
            logger.error(f"Retention email failed for user {user_id}: {e}")
