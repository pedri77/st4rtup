"""Admin Dashboard endpoints — platform metrics (role=admin only)."""
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
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


@router.get("/health")
async def admin_health(current_user: dict = Depends(require_admin)):
    """Platform health status."""
    health = {"cpu_percent": 0, "memory": {}, "disk": {}, "services": {}}
    try:
        import psutil
        health["cpu_percent"] = psutil.cpu_percent(interval=0.1)
        mem = psutil.virtual_memory()
        health["memory"] = {"total_gb": round(mem.total / 1e9, 1), "used_gb": round(mem.used / 1e9, 1), "percent": mem.percent}
        disk = psutil.disk_usage('/')
        health["disk"] = {"total_gb": round(disk.total / 1e9, 1), "used_gb": round(disk.used / 1e9, 1), "percent": round(disk.percent, 1)}
    except ImportError:
        health["memory"] = {"percent": 0, "note": "psutil not installed"}
        health["disk"] = {"percent": 0}
    health["services"] = {"backend": "healthy", "database": "checking..."}
    try:
        from app.core.database import AsyncSessionLocal
        from sqlalchemy import text
        async with AsyncSessionLocal() as db:
            await db.execute(text("SELECT 1"))
        health["services"]["database"] = "healthy"
    except Exception:
        health["services"]["database"] = "error"
    return health


@router.get("/emails")
async def admin_emails(
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """Email metrics."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    total_sent = (await db.execute(select(func.count(Email.id)).where(Email.created_at >= since))).scalar() or 0
    daily = await db.execute(
        select(func.date(Email.created_at), func.count(Email.id))
        .where(Email.created_at >= since)
        .group_by(func.date(Email.created_at))
        .order_by(func.date(Email.created_at))
    )
    by_day = [{"date": str(r[0]), "count": r[1]} for r in daily.all()]
    return {"total_sent": total_sent, "period_days": days, "by_day": by_day}


@router.get("/engagement")
async def admin_engagement(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """Platform engagement metrics."""
    now = datetime.now(timezone.utc)
    from app.models import ActionStatus
    leads_7d = (await db.execute(select(func.count(Lead.id)).where(Lead.created_at >= now - timedelta(days=7)))).scalar() or 0
    opps_7d = (await db.execute(select(func.count(Opportunity.id)).where(Opportunity.created_at >= now - timedelta(days=7)))).scalar() or 0
    actions_7d = (await db.execute(select(func.count(Action.id)).where(Action.status == ActionStatus.COMPLETED, Action.updated_at >= now - timedelta(days=7)))).scalar() or 0
    visits_7d = (await db.execute(select(func.count(Visit.id)).where(Visit.created_at >= now - timedelta(days=7)))).scalar() or 0
    return {"leads_7d": leads_7d, "opportunities_7d": opps_7d, "actions_completed_7d": actions_7d, "visits_7d": visits_7d}


@router.get("/alerts")
async def admin_alerts(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """Active platform alerts."""
    now = datetime.now(timezone.utc)
    alerts = []
    expiring = await db.execute(select(Organization).where(
        Organization.trial_ends_at.isnot(None), Organization.trial_ends_at <= now + timedelta(hours=24), Organization.trial_ends_at > now
    ))
    for org in expiring.scalars().all():
        alerts.append({"type": "trial_expiring", "severity": "warning", "message": f"Trial de '{org.name}' expira en 24h", "org_id": str(org.id)})
    failed = (await db.execute(select(func.count(Payment.id)).where(Payment.status == "failed"))).scalar() or 0
    if failed > 0:
        alerts.append({"type": "payment_failed", "severity": "high", "message": f"{failed} pagos fallidos pendientes"})
    return {"alerts": alerts, "total": len(alerts)}


@router.post("/impersonate/{org_id}")
async def impersonate_org(
    org_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """Impersonate an organization — returns org details for admin debugging."""
    org = await db.get(Organization, org_id)
    if not org:
        raise HTTPException(404, "Organization not found")

    # Get members
    members_q = await db.execute(
        select(OrgMember, User)
        .join(User, User.id == OrgMember.user_id)
        .where(OrgMember.org_id == org_id)
    )
    members = [{"email": u.email, "name": u.full_name, "role": m.role} for m, u in members_q.all()]

    # Get stats
    leads = (await db.execute(select(func.count(Lead.id)).where(Lead.org_id == org_id))).scalar() or 0
    opps = (await db.execute(select(func.count(Opportunity.id)).where(Opportunity.org_id == org_id))).scalar() or 0

    return {
        "org": {
            "id": str(org.id), "name": org.name, "slug": org.slug,
            "plan": org.plan, "sector": org.sector,
            "max_users": org.max_users, "max_leads": org.max_leads,
            "settings": org.settings or {},
            "stripe_subscription_id": org.stripe_subscription_id,
            "is_active": org.is_active,
            "created_at": org.created_at.isoformat() if org.created_at else None,
        },
        "members": members,
        "stats": {"leads": leads, "opportunities": opps},
    }


@router.post("/org/{org_id}/update-plan")
async def admin_update_plan(
    org_id: str,
    plan: str = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """Admin: force update org plan."""
    org = await db.get(Organization, org_id)
    if not org:
        raise HTTPException(404)
    PLAN_LIMITS = {"starter": (1, 100), "growth": (3, 5000), "scale": (10, 999999), "enterprise": (999, 999999)}
    limits = PLAN_LIMITS.get(plan, (1, 100))
    org.plan = plan
    org.max_users = limits[0]
    org.max_leads = limits[1]
    await db.commit()
    return {"updated": True, "plan": plan}
