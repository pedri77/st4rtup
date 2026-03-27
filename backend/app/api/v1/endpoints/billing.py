"""Billing endpoints — trial, subscription, customer portal."""
import logging
from datetime import datetime, timezone, timedelta
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
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

    # Create Stripe Customer Portal session
    import httpx
    try:
        # First get customer from subscription
        async with httpx.AsyncClient(timeout=15.0) as client:
            sub_resp = await client.get(
                f"https://api.stripe.com/v1/subscriptions/{org.stripe_subscription_id}",
                headers={"Authorization": f"Bearer {settings.STRIPE_SECRET_KEY}"},
            )
            if sub_resp.status_code != 200:
                return {"portal_url": None, "message": "Suscripción no encontrada en Stripe"}
            customer_id = sub_resp.json().get("customer", "")

            if not customer_id:
                return {"portal_url": None, "message": "Customer no encontrado"}

            # Create portal session
            portal_resp = await client.post(
                "https://api.stripe.com/v1/billing_portal/sessions",
                headers={"Authorization": f"Bearer {settings.STRIPE_SECRET_KEY}"},
                data={"customer": customer_id, "return_url": "https://st4rtup.com/app/billing"},
            )
            if portal_resp.status_code in (200, 201):
                return {"portal_url": portal_resp.json().get("url", "")}
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
