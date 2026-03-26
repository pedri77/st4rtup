"""Admin Dashboard endpoints — platform metrics (role=admin only)."""
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.organization import Organization, OrgMember
from app.models.user import User
from app.models import Lead, Opportunity, Action, Email, Visit
from app.models.pipeline import OpportunityStage
from app.models.payment import Payment

logger = logging.getLogger(__name__)
router = APIRouter()


def require_admin(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin" and current_user.get("user_metadata", {}).get("role") != "admin":
        raise HTTPException(403, "Admin access required")
    return current_user


@router.get("/kpis")
async def admin_kpis(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """Platform-wide KPIs — no org_id filter."""
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    prev_month_start = (month_start - timedelta(days=1)).replace(day=1)

    # Total users
    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0

    # Total orgs
    total_orgs = (await db.execute(select(func.count(Organization.id)))).scalar() or 0

    # Orgs by plan
    plans = {}
    for plan_name in ['starter', 'growth', 'scale', 'enterprise']:
        count = (await db.execute(select(func.count(Organization.id)).where(Organization.plan == plan_name))).scalar() or 0
        plans[plan_name] = count

    # Signups this month
    signups_month = (await db.execute(select(func.count(User.id)).where(User.created_at >= month_start))).scalar() or 0
    signups_prev = (await db.execute(select(func.count(User.id)).where(User.created_at >= prev_month_start, User.created_at < month_start))).scalar() or 0

    # MRR (Growth × 19 + Scale × 49)
    mrr = (plans.get('growth', 0) * 19) + (plans.get('scale', 0) * 49)

    # Revenue from payments
    revenue_month = (await db.execute(select(func.coalesce(func.sum(Payment.amount_eur), 0)).where(
        Payment.status == 'completed', Payment.created_at >= month_start
    ))).scalar() or 0

    revenue_prev = (await db.execute(select(func.coalesce(func.sum(Payment.amount_eur), 0)).where(
        Payment.status == 'completed', Payment.created_at >= prev_month_start, Payment.created_at < month_start
    ))).scalar() or 0

    # Active users (last 7 days) — users who have leads updated recently
    active_7d = (await db.execute(select(func.count(func.distinct(Lead.org_id))).where(
        Lead.updated_at >= now - timedelta(days=7)
    ))).scalar() or 0

    # Trials active
    trials = (await db.execute(select(func.count(Organization.id)).where(
        Organization.trial_ends_at.isnot(None), Organization.trial_ends_at > now
    ))).scalar() or 0

    # Global stats
    total_leads = (await db.execute(select(func.count(Lead.id)))).scalar() or 0
    total_opps = (await db.execute(select(func.count(Opportunity.id)))).scalar() or 0
    total_emails = (await db.execute(select(func.count(Email.id)))).scalar() or 0

    return {
        "total_users": total_users,
        "total_orgs": total_orgs,
        "plans": plans,
        "signups_month": signups_month,
        "signups_prev_month": signups_prev,
        "mrr": mrr,
        "arr": mrr * 12,
        "revenue_month": float(revenue_month),
        "revenue_prev_month": float(revenue_prev),
        "active_orgs_7d": active_7d,
        "trials_active": trials,
        "total_leads": total_leads,
        "total_opportunities": total_opps,
        "total_emails": total_emails,
    }


@router.get("/organizations")
async def admin_organizations(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """List all organizations with stats."""
    result = await db.execute(select(Organization).order_by(desc(Organization.created_at)).limit(100))
    orgs = result.scalars().all()

    org_list = []
    for org in orgs:
        members = (await db.execute(select(func.count(OrgMember.id)).where(OrgMember.org_id == org.id))).scalar() or 0
        leads = (await db.execute(select(func.count(Lead.id)).where(Lead.org_id == org.id))).scalar() or 0
        opps = (await db.execute(select(func.count(Opportunity.id)).where(Opportunity.org_id == org.id))).scalar() or 0

        org_list.append({
            "id": str(org.id),
            "name": org.name,
            "slug": org.slug,
            "plan": org.plan,
            "sector": org.sector,
            "members": members,
            "leads": leads,
            "opportunities": opps,
            "max_users": org.max_users,
            "max_leads": org.max_leads,
            "trial_ends_at": org.trial_ends_at.isoformat() if org.trial_ends_at else None,
            "is_active": org.is_active,
            "created_at": org.created_at.isoformat() if org.created_at else None,
        })

    return {"items": org_list, "total": len(org_list)}


@router.get("/revenue-chart")
async def admin_revenue_chart(
    months: int = 6,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """Monthly revenue for chart."""
    now = datetime.now(timezone.utc)
    data = []

    for i in range(months - 1, -1, -1):
        d = now - timedelta(days=i * 30)
        month_start = d.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if i > 0:
            next_month = (month_start + timedelta(days=32)).replace(day=1)
        else:
            next_month = now

        rev = (await db.execute(select(func.coalesce(func.sum(Payment.amount_eur), 0)).where(
            Payment.status == 'completed', Payment.created_at >= month_start, Payment.created_at < next_month
        ))).scalar() or 0

        signups = (await db.execute(select(func.count(User.id)).where(
            User.created_at >= month_start, User.created_at < next_month
        ))).scalar() or 0

        data.append({
            "month": month_start.strftime("%b %Y"),
            "revenue": float(rev),
            "signups": signups,
        })

    return {"data": data}


@router.get("/recent-signups")
async def admin_recent_signups(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """Last 20 signups."""
    result = await db.execute(select(User).order_by(desc(User.created_at)).limit(20))
    users = result.scalars().all()

    return {"items": [{
        "id": str(u.id),
        "email": u.email,
        "full_name": u.full_name,
        "role": u.role,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    } for u in users]}


@router.get("/feature-usage")
async def admin_feature_usage(
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """Top features by usage."""
    try:
        from app.models.usage_event import UsageEvent
        since = datetime.now(timezone.utc) - timedelta(days=days)
        result = await db.execute(
            select(UsageEvent.feature, func.sum(UsageEvent.count).label("total"))
            .where(UsageEvent.day >= since)
            .group_by(UsageEvent.feature)
            .order_by(func.sum(UsageEvent.count).desc())
            .limit(15)
        )
        features = [{"feature": r[0], "count": r[1]} for r in result.all()]
        return {"features": features, "period_days": days}
    except Exception:
        return {"features": [], "period_days": days}
