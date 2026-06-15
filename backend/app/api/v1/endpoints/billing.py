"""Billing endpoints — trial, subscription, customer portal."""
import logging
from datetime import datetime, timezone, timedelta
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.models.subscription import Subscription

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/trial/start")
async def start_trial(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Start 7-day Growth trial for new user."""
    existing = await db.execute(select(Subscription).where(
        Subscription.user_id == current_user["user_id"],
        Subscription.status.in_(["active", "trialing"])
    ))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Ya tienes una suscripción activa")

    trial = Subscription(
        user_id=current_user["user_id"],
        plan="growth",
        status="trialing",
        trial_ends_at=datetime.now(timezone.utc) + timedelta(days=7),
        current_period_start=datetime.now(timezone.utc),
        current_period_end=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db.add(trial)
    await db.commit()
    return {"plan": "growth", "trial_days": 7, "expires": trial.trial_ends_at.isoformat()}


@router.get("/subscription")
async def get_subscription(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get current user's subscription."""
    result = await db.execute(select(Subscription).where(
        Subscription.user_id == current_user["user_id"],
        Subscription.status.in_(["active", "trialing"])
    ).order_by(desc(Subscription.created_at)).limit(1))
    sub = result.scalar_one_or_none()
    if not sub:
        return {"plan": "starter", "status": "active"}
    return {
        "plan": sub.plan,
        "status": sub.status,
        "trial_ends_at": sub.trial_ends_at.isoformat() if sub.trial_ends_at else None,
        "current_period_end": sub.current_period_end.isoformat() if sub.current_period_end else None,
        "billing_cycle": sub.billing_cycle,
        "amount_eur": sub.amount_eur,
    }


@router.get("/portal-url")
async def get_customer_portal_url(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get Stripe Customer Portal URL for self-service subscription management."""
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(400, "Stripe no configurado")

    # Find org's stripe customer id
    from app.core.tenant import get_current_org
    from app.models.organization import Organization, OrgMember
    user_id = current_user.get("user_id", "")
    member = (await db.execute(select(OrgMember).where(OrgMember.user_id == user_id).limit(1))).scalar_one_or_none()
    if not member:
        raise HTTPException(400, "No tienes una organización")

    org = await db.get(Organization, str(member.org_id))
    if not org or not org.stripe_subscription_id:
        return {"portal_url": None, "message": "No tienes suscripción activa en Stripe"}

    # Create Stripe Customer Portal session via SDK
    from app.services.payment_service import stripe_get_subscription, stripe_create_portal_session
    try:
        sub = stripe_get_subscription(org.stripe_subscription_id)
        customer_id = sub.get("customer", "")
        if not customer_id:
            return {"portal_url": None, "message": "Customer no encontrado"}

        portal = stripe_create_portal_session(customer_id, "https://st4rtup.com/app/billing")
        return {"portal_url": portal.get("url", "")}
    except Exception as e:
        logger.error(f"Stripe portal error: {e}")

    return {"portal_url": None, "message": "Error al crear el portal"}


@router.get("/invoices")
async def list_invoices(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List user's invoices from payments table."""
    from app.models.payment import Payment
    from app.core.tenant import get_org_id
    from app.models.organization import OrgMember
    user_id = current_user.get("user_id", "")
    member = (await db.execute(select(OrgMember).where(OrgMember.user_id == user_id).limit(1))).scalar_one_or_none()
    if not member:
        return {"items": []}

    result = await db.execute(
        select(Payment).where(Payment.org_id == str(member.org_id))
        .order_by(desc(Payment.created_at)).limit(20)
    )
    payments = result.scalars().all()
    return {"items": [{
        "id": str(p.id), "amount_eur": p.amount_eur, "status": p.status,
        "provider": p.provider, "description": p.description,
        "receipt_url": p.receipt_url, "paid_at": p.paid_at.isoformat() if p.paid_at else None,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    } for p in payments]}


@router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook: checkout completed -> send onboarding email."""
    import json
    from app.core.webhook_verify import verify_webhook_signature

    payload = await verify_webhook_signature(request, "stripe")
    event = json.loads(payload)
    event_type = event.get("type", "")

    if event_type == "checkout.session.completed":
        session = event.get("data", {}).get("object", {})
        email = session.get("customer_details", {}).get("email", "")
        name = session.get("customer_details", {}).get("name", "")
        plan = session.get("metadata", {}).get("plan", "growth")
        if email:
            await _send_onboarding_email(email, name, plan)

    return {"received": True}


async def _send_onboarding_email(email: str, name: str, plan: str):
    """Send welcome email via Brevo after successful checkout."""
    import httpx
    import os

    brevo_key = os.getenv("BREVO_API_KEY", "")
    if not brevo_key:
        logger.warning("BREVO_API_KEY not set, skipping onboarding email")
        return

    display = name or email.split("@")[0]
    html = f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0F172A;font-family:'Plus Jakarta Sans',system-ui,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0F172A;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#1E293B;border-radius:12px;overflow:hidden;">
  <tr><td style="background:linear-gradient(135deg,#1E6FD9,#1447A0);padding:32px 40px;text-align:center;">
    <h1 style="color:#FFFFFF;font-size:28px;margin:0;">st4rtup</h1>
    <p style="color:#93C5FD;font-size:14px;margin:8px 0 0;">Tu CRM inteligente</p>
  </td></tr>
  <tr><td style="padding:40px;">
    <h2 style="color:#F1F5F9;font-size:22px;margin:0 0 16px;">Bienvenido, {display}</h2>
    <p style="color:#94A3B8;font-size:15px;line-height:1.6;margin:0 0 24px;">
      Tu plan <strong style="color:#60A5FA;">{plan.capitalize()}</strong> ya esta activo.
      Tienes todo listo para empezar a cerrar deals.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
      <tr><td style="padding:12px 16px;background:#0F172A;border-radius:8px;border-left:3px solid #1E6FD9;">
        <p style="color:#60A5FA;font-size:13px;font-weight:600;margin:0 0 4px;">Paso 1</p>
        <p style="color:#CBD5E1;font-size:14px;margin:0;">Accede a tu dashboard y explora las secciones</p>
      </td></tr>
      <tr><td style="height:8px;"></td></tr>
      <tr><td style="padding:12px 16px;background:#0F172A;border-radius:8px;border-left:3px solid #1E6FD9;">
        <p style="color:#60A5FA;font-size:13px;font-weight:600;margin:0 0 4px;">Paso 2</p>
        <p style="color:#CBD5E1;font-size:14px;margin:0;">Importa tus primeros leads (CSV o manual)</p>
      </td></tr>
      <tr><td style="height:8px;"></td></tr>
      <tr><td style="padding:12px 16px;background:#0F172A;border-radius:8px;border-left:3px solid #1E6FD9;">
        <p style="color:#60A5FA;font-size:13px;font-weight:600;margin:0 0 4px;">Paso 3</p>
        <p style="color:#CBD5E1;font-size:14px;margin:0;">Conecta tu email para enviar secuencias</p>
      </td></tr>
      <tr><td style="height:8px;"></td></tr>
      <tr><td style="padding:12px 16px;background:#0F172A;border-radius:8px;border-left:3px solid #1E6FD9;">
        <p style="color:#60A5FA;font-size:13px;font-weight:600;margin:0 0 4px;">Paso 4</p>
        <p style="color:#CBD5E1;font-size:14px;margin:0;">Configura tu pipeline y empieza a vender</p>
      </td></tr>
    </table>
    <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
      <tr><td style="background:#1E6FD9;border-radius:8px;padding:14px 32px;">
        <a href="https://st4rtup.com/app" style="color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:600;">Ir al dashboard</a>
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
                headers={"api-key": brevo_key, "Content-Type": "application/json"},
                json={
                    "sender": {"name": "st4rtup", "email": "info@st4rtup.com"},
                    "to": [{"email": email}],
                    "subject": f"Bienvenido a st4rtup \u2014 Plan {plan.capitalize()} activo",
                    "htmlContent": html,
                },
            )
            logger.info(f"Onboarding email sent to {email}: {resp.status_code}")
    except Exception as e:
        logger.error(f"Failed to send onboarding email to {email}: {e}")
