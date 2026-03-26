"""Billing endpoints — trial, subscription management."""
from datetime import datetime, timezone, timedelta
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.subscription import Subscription

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
