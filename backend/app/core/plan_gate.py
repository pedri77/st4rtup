"""
Plan Gate — Middleware para restringir endpoints según el plan del usuario.

Uso en endpoints:
    from app.core.plan_gate import require_plan, require_feature

    @router.get("/calls/queues")
    async def list_queues(
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(get_current_user),
        _plan = Depends(require_plan("growth")),      # Mínimo Growth
    ):
        ...

    @router.post("/deal-room/upload")
    async def upload(
        db: AsyncSession = Depends(get_db),
        current_user: dict = Depends(get_current_user),
        _feat = Depends(require_feature("deal_room")),  # Feature específica
    ):
        ...
"""
from fastapi import Depends, HTTPException
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.core.security import get_current_user
from app.models.subscription import Subscription, plan_has_feature, plan_at_least, get_plan_limits


async def get_user_plan(current_user: dict = Depends(get_current_user)) -> str:
    """Gets the current user's active plan. Defaults to 'starter'."""
    try:
        from app.core.database import AsyncSessionLocal
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Subscription.plan).where(
                    Subscription.user_id == current_user["user_id"],
                    Subscription.status.in_(["active", "trialing"]),
                ).order_by(Subscription.created_at.desc()).limit(1)
            )
            plan = result.scalar_one_or_none()
            return plan or "starter"
    except Exception:
        return "starter"


def require_plan(min_plan: str):
    """Dependency: requires user to be on at least `min_plan`."""
    async def check(current_user: dict = Depends(get_current_user)):
        user_plan = await get_user_plan(current_user)
        if not plan_at_least(user_plan, min_plan):
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "plan_required",
                    "message": f"Esta funcionalidad requiere el plan {min_plan.title()} o superior.",
                    "current_plan": user_plan,
                    "required_plan": min_plan,
                    "upgrade_url": "/pricing",
                }
            )
        return user_plan
    return check


def require_feature(feature: str):
    """Dependency: requires user's plan to include `feature`."""
    async def check(current_user: dict = Depends(get_current_user)):
        user_plan = await get_user_plan(current_user)
        if not plan_has_feature(user_plan, feature):
            raise HTTPException(
                status_code=403,
                detail={
                    "error": "feature_not_available",
                    "message": f"La funcionalidad '{feature}' no está incluida en tu plan actual.",
                    "current_plan": user_plan,
                    "feature": feature,
                    "upgrade_url": "/pricing",
                }
            )
        return user_plan
    return check


async def check_lead_limit(current_user: dict = Depends(get_current_user)):
    """Check if user hasn't exceeded lead limit for their plan."""
    user_plan = await get_user_plan(current_user)
    limits = get_plan_limits(user_plan)
    max_leads = limits["max_leads"]

    try:
        from app.models.lead import Lead
        async with AsyncSessionLocal() as db:
            count = (await db.execute(
                select(Lead.id).where(Lead.created_by == current_user.get("email"))
            )).scalar() or 0
            # Simplified: count all leads (in production, count by organization)
    except Exception:
        count = 0

    if count >= max_leads:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "limit_reached",
                "message": f"Has alcanzado el límite de {max_leads} leads en tu plan {user_plan.title()}.",
                "current_count": count,
                "max_allowed": max_leads,
                "current_plan": user_plan,
                "upgrade_url": "/pricing",
            }
        )
    return user_plan


async def check_user_limit(current_user: dict = Depends(get_current_user)):
    """Check if organization hasn't exceeded user limit."""
    user_plan = await get_user_plan(current_user)
    limits = get_plan_limits(user_plan)
    max_users = limits["max_users"]

    try:
        from app.models.user import User
        async with AsyncSessionLocal() as db:
            count = (await db.execute(select(User.id))).scalar() or 0
    except Exception:
        count = 0

    if count >= max_users:
        raise HTTPException(
            status_code=403,
            detail={
                "error": "user_limit_reached",
                "message": f"Has alcanzado el límite de {max_users} usuarios en tu plan {user_plan.title()}.",
                "current_count": count,
                "max_allowed": max_users,
                "current_plan": user_plan,
                "upgrade_url": "/pricing",
            }
        )
    return user_plan
