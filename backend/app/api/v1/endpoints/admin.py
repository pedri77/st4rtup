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
from app.models.survey import EmailTemplate

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


@router.post("/impersonate/{org_id}/login")
async def impersonate_login(
    org_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """Generate a temporary impersonation URL for an org's admin user.

    Uses the existing session to create an admin-scoped redirect token.
    The frontend opens the app as that org's admin.
    """
    # Find an admin/owner member of this org. Owner is the highest role and
    # is also impersonatable; some orgs only have an owner (no separate admin)
    # and would otherwise be unreachable.
    result = await db.execute(
        select(OrgMember, User)
        .join(User, User.id == OrgMember.user_id)
        .where(OrgMember.org_id == org_id, OrgMember.role.in_(("admin", "owner")))
        .order_by(OrgMember.role.asc())  # admin before owner alphabetically
        .limit(1)
    )
    row = result.first()
    if not row:
        raise HTTPException(404, "No admin or owner user found for this org")

    member, user = row
    from app.core.security import create_access_token
    # Create short-lived token (15 min) with impersonation flag
    token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "impersonated_by": current_user["email"],
            "org_id": org_id,
        },
        expires_delta=timedelta(minutes=15),
    )
    logger.info(f"Admin {current_user['email']} impersonating org={org_id} user={user.email}")

    return {
        "token": token,
        "user_email": user.email,
        "user_name": user.full_name,
        "org_name": (await db.get(Organization, org_id)).name,
        "expires_in": 900,
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


# ─── API USAGE COSTS ─────────────────────────────────────────

@router.get("/api-costs")
async def admin_api_costs(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """Calculate API usage costs from chat messages (tokens consumed)."""
    # Token prices per 1M tokens (approximate)
    PRICES = {
        "gpt-4o": {"input": 2.50, "output": 10.00},
        "gpt-4o-mini": {"input": 0.15, "output": 0.60},
        "gpt-3.5-turbo": {"input": 0.50, "output": 1.50},
        "deepseek-chat": {"input": 0.14, "output": 0.28},
        "deepseek-reasoner": {"input": 0.55, "output": 2.19},
        "claude-sonnet-4-20250514": {"input": 3.00, "output": 15.00},
        "mistral-large-latest": {"input": 2.00, "output": 6.00},
        "text-embedding-3-small": {"input": 0.02, "output": 0.0},
    }
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    from app.models import ChatMessage
    result = await db.execute(
        select(
            ChatMessage.model,
            func.sum(ChatMessage.tokens_input).label("total_input"),
            func.sum(ChatMessage.tokens_output).label("total_output"),
            func.count(ChatMessage.id).label("count"),
        )
        .where(ChatMessage.created_at >= month_start, ChatMessage.role == "assistant")
        .group_by(ChatMessage.model)
    )
    rows = result.all()

    providers = []
    total_cost = 0.0
    total_tokens = 0
    for row in rows:
        model = row.model or "unknown"
        inp = row.total_input or 0
        out = row.total_output or 0
        price = PRICES.get(model, {"input": 1.0, "output": 3.0})
        cost = (inp / 1_000_000 * price["input"]) + (out / 1_000_000 * price["output"])
        total_cost += cost
        total_tokens += inp + out
        providers.append({
            "model": model,
            "messages": row.count,
            "tokens_input": inp,
            "tokens_output": out,
            "cost_usd": round(cost, 4),
        })

    return {
        "month": month_start.strftime("%Y-%m"),
        "total_cost_usd": round(total_cost, 4),
        "total_tokens": total_tokens,
        "budget_usd": 50.0,
        "usage_pct": round((total_cost / 50.0) * 100, 1) if total_cost > 0 else 0,
        "providers": sorted(providers, key=lambda x: x["cost_usd"], reverse=True),
    }


# ─── PLATFORM COSTS ──────────────────────────────────────────

from sqlalchemy import text as sql_text

@router.get("/costs")
async def admin_costs(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """List all platform costs."""
    result = await db.execute(sql_text("SELECT * FROM platform_costs ORDER BY category, name"))
    cols = result.keys()
    items = [dict(zip(cols, row)) for row in result.fetchall()]
    # Fix UUID/datetime serialization
    for item in items:
        for k, v in item.items():
            if hasattr(v, 'isoformat'):
                item[k] = v.isoformat()
            elif hasattr(v, 'hex'):
                item[k] = str(v)

    total_monthly = sum(i.get('amount_eur', 0) for i in items if i.get('billing_cycle') == 'monthly' and i.get('is_active'))
    total_annual = sum(i.get('amount_eur', 0) for i in items if i.get('billing_cycle') == 'annual' and i.get('is_active'))

    return {
        "items": items,
        "total": len(items),
        "total_monthly_eur": round(total_monthly, 2),
        "total_annual_eur": round(total_annual, 2),
        "estimated_monthly_eur": round(total_monthly + total_annual / 12, 2),
    }


@router.post("/costs/create")
async def admin_create_cost(
    name: str = Query(...),
    provider: str = Query(...),
    category: str = Query("infrastructure"),
    amount_eur: float = Query(...),
    billing_cycle: str = Query("monthly"),
    is_variable: bool = Query(False),
    notes: str = Query(""),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """Create platform cost entry."""
    await db.execute(sql_text(
        "INSERT INTO platform_costs (name, provider, category, amount_eur, billing_cycle, is_variable, notes) "
        "VALUES (:name, :provider, :category, :amount_eur, :billing_cycle, :is_variable, :notes)"
    ), {"name": name, "provider": provider, "category": category, "amount_eur": amount_eur, "billing_cycle": billing_cycle, "is_variable": is_variable, "notes": notes})
    await db.commit()
    return {"created": True}


@router.delete("/costs/{cost_id}")
async def admin_delete_cost(
    cost_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """Delete platform cost."""
    await db.execute(sql_text("DELETE FROM platform_costs WHERE id = :id"), {"id": cost_id})
    await db.commit()
    return {"deleted": True}


# ─── ADMIN V2: LOGS, AUDIT, ORG METRICS ─────────────────────

@router.get("/logs")
async def admin_logs(
    lines: int = Query(50, ge=10, le=200),
    level: str = Query("all"),
    current_user: dict = Depends(require_admin),
):
    """Recent backend logs from rotating log file."""
    import os
    log_file = "/tmp/app.log"
    try:
        if not os.path.exists(log_file):
            return {"lines": [], "total": 0, "errors": 0, "error_lines": []}
        with open(log_file, "r") as f:
            all_lines = f.readlines()
        # Filter by level
        if level == "error":
            all_lines = [l for l in all_lines if "ERROR" in l or "CRITICAL" in l or "Traceback" in l]
        elif level == "warning":
            all_lines = [l for l in all_lines if "WARNING" in l]
        log_lines = [l.rstrip() for l in all_lines[-lines:]]
        errors = [l for l in log_lines if "ERROR" in l or "CRITICAL" in l or "Traceback" in l]
        return {
            "lines": log_lines,
            "total": len(log_lines),
            "errors": len(errors),
            "error_lines": errors[-10:],
        }
    except Exception as e:
        return {"lines": [], "total": 0, "errors": 0, "error": str(e)}


@router.get("/org/{org_id}/metrics")
async def admin_org_metrics(
    org_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """Detailed metrics for a specific organization."""
    now = datetime.now(timezone.utc)
    week = now - timedelta(days=7)
    month = now - timedelta(days=30)

    leads_total = (await db.execute(select(func.count(Lead.id)).where(Lead.org_id == org_id))).scalar() or 0
    leads_week = (await db.execute(select(func.count(Lead.id)).where(Lead.org_id == org_id, Lead.created_at >= week))).scalar() or 0
    opps_total = (await db.execute(select(func.count(Opportunity.id)).where(Opportunity.org_id == org_id))).scalar() or 0
    actions_total = (await db.execute(select(func.count(Action.id)).where(Action.org_id == org_id))).scalar() or 0
    emails_total = (await db.execute(select(func.count(Email.id)).where(Email.org_id == org_id))).scalar() or 0

    # Activity by day (last 30 days)
    daily = await db.execute(
        select(func.date(Lead.created_at), func.count(Lead.id))
        .where(Lead.org_id == org_id, Lead.created_at >= month)
        .group_by(func.date(Lead.created_at))
        .order_by(func.date(Lead.created_at))
    )
    activity = [{"date": str(r[0]), "leads": r[1]} for r in daily.all()]

    return {
        "org_id": org_id,
        "leads": {"total": leads_total, "last_7d": leads_week},
        "opportunities": opps_total,
        "actions": actions_total,
        "emails": emails_total,
        "daily_activity": activity,
    }


@router.get("/onboarding-status")
async def admin_onboarding_status(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """Overview of onboarding completion across all orgs."""
    result = await db.execute(select(Organization).order_by(desc(Organization.created_at)).limit(50))
    orgs = result.scalars().all()

    statuses = []
    for org in orgs:
        has_leads = (await db.execute(select(func.count(Lead.id)).where(Lead.org_id == org.id))).scalar() or 0
        has_opps = (await db.execute(select(func.count(Opportunity.id)).where(Opportunity.org_id == org.id))).scalar() or 0
        has_emails = (await db.execute(select(func.count(Email.id)).where(Email.org_id == org.id))).scalar() or 0

        steps_done = sum([
            has_leads > 0,
            has_opps > 0,
            has_emails > 0,
            bool(org.sector),
            bool(org.stripe_subscription_id),
        ])
        statuses.append({
            "org_id": str(org.id), "name": org.name, "plan": org.plan,
            "steps_done": steps_done, "total_steps": 5,
            "has_leads": has_leads > 0, "has_opps": has_opps > 0,
            "has_emails": has_emails > 0, "has_sector": bool(org.sector),
            "has_payment": bool(org.stripe_subscription_id),
            "created_at": org.created_at.isoformat() if org.created_at else None,
        })

    return {"items": statuses, "total": len(statuses)}


# ─── Integration health dashboard ──────────────────────────────

@router.get("/integration-health")
async def integration_health(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """Estado de las integraciones por org: OAuth tokens, último refresh,
    automatizaciones activas. Lee `system_settings` (no descifra — solo
    reporta presencia/ausencia) y cuenta `automations`.

    Returns:
        {
          "orgs": [
            {
              "org_id": "...", "name": "...",
              "integrations": {
                "gmail":   {"connected": bool, "email": "...", "token_age_days": int|null},
                "gsc":     {"connected": bool, "site_url": "...", "token_age_days": int|null},
                "linkedin":{"connected": bool, "name": "...", "token_age_days": int|null},
                ...
              },
              "automations": {"total": int, "active": int, "failing": int}
            }
          ],
          "summary": {"total_orgs": int, "orgs_with_oauth": int, "active_automations": int}
        }
    """
    from app.models.system import SystemSettings
    from app.models.automation import Automation, AutomationExecution
    from app.models.enums import AutomationStatus, AutomationImplStatus

    # 1. Fetch all orgs with their settings
    orgs_result = await db.execute(
        select(Organization).order_by(Organization.created_at.desc())
    )
    orgs = orgs_result.scalars().all()

    # 2. For each org, check settings row + automations stats
    items = []
    total_with_oauth = 0
    total_active_automations = 0

    for org in orgs:
        settings_result = await db.execute(
            select(SystemSettings).limit(1)  # currently SystemSettings is global, not per-org
        )
        settings_row = settings_result.scalar_one_or_none()

        def _check(cfg_attr: str, name_field: str = "email"):
            cfg = getattr(settings_row, cfg_attr, None) if settings_row else None
            if not cfg or not isinstance(cfg, dict):
                return {"connected": False, name_field: None, "token_age_days": None}
            connected = bool(cfg.get("connected") or cfg.get("access_token"))
            # We never decrypt here — just expose metadata
            expires_at = cfg.get("expires_at", 0)
            age_days = None
            if expires_at:
                try:
                    age_days = max(0, int((datetime.now(timezone.utc).timestamp() - float(expires_at)) / 86400))
                except Exception:
                    pass
            return {
                "connected": connected,
                name_field: cfg.get(name_field) or cfg.get("name") or cfg.get("site_url"),
                "token_age_days": age_days,
            }

        integrations = {
            "gmail": _check("gmail_oauth_config", "email"),
            "gsc": _check("gsc_config", "site_url"),
            "gcalendar": _check("gcalendar_config", "email"),
            "gdrive": _check("gdrive_config", "email"),
            "linkedin": _check("linkedin_config", "name"),
            "youtube": _check("youtube_config", "name"),
            "brevo": {
                "connected": bool(settings_row and settings_row.email_config
                                  and isinstance(settings_row.email_config, dict)
                                  and (settings_row.email_config.get("brevo_api_key") or "").startswith("enc:")),
                "email": None, "token_age_days": None,
            } if settings_row else {"connected": False, "email": None, "token_age_days": None},
            "telegram": {
                "connected": bool(settings_row and settings_row.telegram_config
                                  and isinstance(settings_row.telegram_config, dict)
                                  and settings_row.telegram_config.get("bot_token")),
                "email": None, "token_age_days": None,
            } if settings_row else {"connected": False, "email": None, "token_age_days": None},
        }

        if any(i.get("connected") for i in integrations.values()):
            total_with_oauth += 1

        # Automations stats for this org
        total_auto = (await db.execute(
            select(func.count(Automation.id)).where(Automation.org_id == org.id)
        )).scalar() or 0
        active_auto = (await db.execute(
            select(func.count(Automation.id)).where(
                Automation.org_id == org.id,
                Automation.status == AutomationStatus.ACTIVE,
                Automation.is_enabled.is_(True),
            )
        )).scalar() or 0

        # Count failing executions in last 24h
        since = datetime.now(timezone.utc) - timedelta(days=1)
        failing_auto = (await db.execute(
            select(func.count(func.distinct(AutomationExecution.automation_id)))
            .join(Automation, Automation.id == AutomationExecution.automation_id)
            .where(
                Automation.org_id == org.id,
                AutomationExecution.status == "error",
                AutomationExecution.created_at >= since,
            )
        )).scalar() or 0

        total_active_automations += active_auto

        items.append({
            "org_id": str(org.id),
            "name": org.name,
            "slug": org.slug,
            "plan": org.plan,
            "integrations": integrations,
            "automations": {
                "total": total_auto,
                "active": active_auto,
                "failing_24h": failing_auto,
            },
        })

    return {
        "orgs": items,
        "summary": {
            "total_orgs": len(items),
            "orgs_with_oauth": total_with_oauth,
            "active_automations": total_active_automations,
        },
    }


# ─── EMAIL TEMPLATES (admin CRUD) ────────────────────────────────

@router.get("/email-templates")
async def admin_list_email_templates(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """List all email templates across orgs."""
    total = (await db.execute(select(func.count(EmailTemplate.id)))).scalar() or 0
    result = await db.execute(
        select(EmailTemplate)
        .order_by(desc(EmailTemplate.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    templates = result.scalars().all()
    items = []
    for t in templates:
        items.append({
            "id": str(t.id),
            "name": t.name,
            "description": t.description,
            "category": t.category,
            "subject": t.subject,
            "body_html": t.body_html,
            "body_text": t.body_text,
            "variables": t.variables,
            "is_active": t.is_active,
            "org_id": str(t.org_id) if t.org_id else None,
            "created_at": t.created_at.isoformat() if t.created_at else None,
            "updated_at": t.updated_at.isoformat() if t.updated_at else None,
        })
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@router.post("/email-templates")
async def admin_create_email_template(
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """Create a global email template."""
    template = EmailTemplate(
        name=data["name"],
        subject=data["subject"],
        body_html=data.get("body_html", ""),
        body_text=data.get("body_text"),
        description=data.get("description"),
        category=data.get("category"),
        variables=data.get("variables"),
        is_active=data.get("is_active", True),
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return {
        "id": str(template.id),
        "name": template.name,
        "subject": template.subject,
        "created": True,
    }


@router.put("/email-templates/{template_id}")
async def admin_update_email_template(
    template_id: str,
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """Update an email template."""
    template = await db.get(EmailTemplate, template_id)
    if not template:
        raise HTTPException(404, "Template not found")
    for field in ("name", "subject", "body_html", "body_text", "description", "category", "variables", "is_active"):
        if field in data:
            setattr(template, field, data[field])
    await db.commit()
    return {"updated": True, "id": str(template.id)}


@router.delete("/email-templates/{template_id}")
async def admin_delete_email_template(
    template_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """Delete an email template."""
    template = await db.get(EmailTemplate, template_id)
    if not template:
        raise HTTPException(404, "Template not found")
    await db.delete(template)
    await db.commit()
    return {"deleted": True}


# ---------------------------------------------------------------------------
# API Keys (M2M authentication)
# ---------------------------------------------------------------------------


@router.post("/api-keys")
async def create_api_key(
    name: str = Query(..., description="Nombre descriptivo de la key"),
    scopes: str = Query("read", description="Scopes separados por coma: read,write,admin"),
    expires_days: int = Query(None, description="Dias hasta expiracion (null = sin expiracion)"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """Create a new API key. Returns the plaintext key ONCE."""
    from app.models.api_key import ApiKey, generate_api_key

    plaintext_key, key_hash, prefix = generate_api_key()
    scope_list = [s.strip() for s in scopes.split(",") if s.strip()]

    expires_at = None
    if expires_days:
        expires_at = datetime.now(timezone.utc) + timedelta(days=expires_days)

    api_key = ApiKey(
        name=name,
        key_hash=key_hash,
        key_prefix=prefix,
        scopes=scope_list,
        expires_at=expires_at,
        created_by=current_user.get("email", "admin"),
    )
    db.add(api_key)
    await db.commit()
    await db.refresh(api_key)

    return {
        "id": str(api_key.id),
        "name": name,
        "key": plaintext_key,  # SHOWN ONCE — never stored
        "prefix": prefix,
        "scopes": scope_list,
        "expires_at": expires_at.isoformat() if expires_at else None,
        "warning": "Guarda esta key ahora. No se puede recuperar.",
    }


@router.get("/api-keys")
async def list_api_keys(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """List all API keys (without plaintext values)."""
    from app.models.api_key import ApiKey

    result = await db.execute(
        select(ApiKey).order_by(desc(ApiKey.created_at))
    )
    keys = result.scalars().all()

    return {
        "api_keys": [
            {
                "id": str(k.id),
                "name": k.name,
                "prefix": k.key_prefix,
                "scopes": k.scopes,
                "is_active": k.is_active,
                "is_valid": k.is_valid,
                "expires_at": k.expires_at.isoformat() if k.expires_at else None,
                "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None,
                "created_at": k.created_at.isoformat(),
                "created_by": k.created_by,
            }
            for k in keys
        ]
    }


@router.post("/api-keys/{key_id}/revoke")
async def revoke_api_key(
    key_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """Revoke an API key (irreversible)."""
    from app.models.api_key import ApiKey
    from uuid import UUID

    api_key = await db.get(ApiKey, UUID(key_id))
    if not api_key:
        raise HTTPException(404, "API key not found")

    api_key.is_active = False
    api_key.revoked_at = datetime.now(timezone.utc)
    await db.commit()

    return {"revoked": True, "id": key_id, "name": api_key.name}
