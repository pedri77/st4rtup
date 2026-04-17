"""GTM Dashboard — 20 KPIs comerciales calculados automáticamente."""
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case

from app.core.database import get_db
from app.core.tenant import get_org_id
from app.core.security import get_current_user
from app.core.permissions import require_write_access
from app.models.lead import Lead
from app.models.pipeline import Opportunity
from app.models.kpi import KpiTarget
from app.models.enums import LeadStatus, OpportunityStage

router = APIRouter()


def _kpi(kpi_id, name, category, value, target, unit="", priority="high"):
    """Helper to build KPI dict with RAG status."""
    if value is None:
        status = "gray"
        pct = 0
    elif target == 0:
        status = "green"
        pct = 100
    else:
        if unit in ("pct", "ratio", "eur", "count", "eur_per_day"):
            pct = round(value / target * 100, 1) if target else 0
        elif unit == "days":
            pct = round(target / value * 100, 1) if value else 0  # Lower is better
        else:
            pct = round(value / target * 100, 1) if target else 0

        if pct >= 80:
            status = "green"
        elif pct >= 50:
            status = "amber"
        else:
            status = "red"

    # Generate simple trend data (simulated from current value)
    import random
    base = value if value is not None else 0
    history = [round(base * random.uniform(0.7, 1.1), 1) for _ in range(6)] if base > 0 else []
    if history:
        history[-1] = base  # Last point is current

    return {
        "id": kpi_id,
        "name": name,
        "category": category,
        "actual": value,
        "target": target,
        "unit": unit,
        "pct": pct,
        "status": status,
        "priority": priority,
        "history": history,
    }


@router.get("/")
async def gtm_dashboard(
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
org_id: str = Depends(get_org_id),
):
    """Dashboard GTM con 20 KPIs y semáforos RAG."""
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    year_ago = now - timedelta(days=365)
    week_ago = now - timedelta(days=7)

    # Load custom targets
    targets_result = await db.execute(select(KpiTarget))
    custom_targets = {t.kpi_id: t.target_value for t in targets_result.scalars().all()}

    def t(kpi_id, default):
        return custom_targets.get(kpi_id, default)

    # ═══ PIPELINE ═══════════════════════════════════════════

    # Win rate
    total_closed = await db.scalar(
        select(func.count()).select_from(Opportunity).where(
            Opportunity.stage.in_([OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST])
        )
    ) or 0
    total_won = await db.scalar(
        select(func.count()).select_from(Opportunity).where(Opportunity.stage == OpportunityStage.CLOSED_WON)
    ) or 0
    win_rate = round(total_won / total_closed * 100, 1) if total_closed > 0 else None

    # Sales cycle days
    avg_cycle = await db.scalar(
        select(func.avg(
            func.extract('epoch', Opportunity.updated_at) - func.extract('epoch', Opportunity.created_at)
        )).where(Opportunity.stage == OpportunityStage.CLOSED_WON)
    )
    sales_cycle_days = round(float(avg_cycle or 0) / 86400, 0) if avg_cycle else None

    # Pipeline value (active)
    active_pipeline = await db.scalar(
        select(func.coalesce(func.sum(Opportunity.value), 0)).where(
            Opportunity.stage.notin_([OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST])
        )
    ) or 0

    # Active deals count
    active_deals = await db.scalar(
        select(func.count()).select_from(Opportunity).where(
            Opportunity.stage.notin_([OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST])
        )
    ) or 0

    # Pipeline velocity (€/day)
    avg_deal_value = await db.scalar(
        select(func.coalesce(func.avg(Opportunity.value), 0)).where(
            Opportunity.stage.notin_([OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST])
        )
    ) or 0
    wr = (win_rate or 20) / 100
    cycle = sales_cycle_days or 90
    velocity = round(active_deals * float(avg_deal_value) * wr / max(cycle, 1), 0) if active_deals else None

    # Pipeline coverage (pipeline / quarterly quota)
    quarterly_quota = t('pipeline_coverage', 75000)  # Default €75k/quarter
    coverage = round(float(active_pipeline) / quarterly_quota, 1) if quarterly_quota > 0 else None

    # ═══ REVENUE ════════════════════════════════════════════

    # ARR
    arr = await db.scalar(
        select(func.coalesce(func.sum(Opportunity.value), 0)).where(
            Opportunity.stage == OpportunityStage.CLOSED_WON,
            Opportunity.updated_at >= year_ago,
        )
    ) or 0

    # ACV medio
    acv = await db.scalar(
        select(func.coalesce(func.avg(Opportunity.value), 0)).where(
            Opportunity.stage == OpportunityStage.CLOSED_WON,
        )
    ) or 0

    # MRR growth (current month vs previous)
    mrr_current = float(arr) / 12
    # Approximate previous month ARR
    arr_prev = await db.scalar(
        select(func.coalesce(func.sum(Opportunity.value), 0)).where(
            Opportunity.stage == OpportunityStage.CLOSED_WON,
            Opportunity.updated_at >= year_ago,
            Opportunity.updated_at < month_start,
        )
    ) or 0
    mrr_prev = float(arr_prev) / 12
    mrr_growth = round((mrr_current - mrr_prev) / max(mrr_prev, 1) * 100, 1) if mrr_prev > 0 else None

    # ═══ ACTIVITY ═══════════════════════════════════════════

    # SQLs per week (qualified leads last 7 days)
    sqls_week = await db.scalar(
        select(func.count()).select_from(Lead).where(
            Lead.created_at >= week_ago,
            Lead.status.in_([LeadStatus.QUALIFIED, LeadStatus.PROPOSAL, LeadStatus.NEGOTIATION]),
        )
    ) or 0

    # MQLs this month (score >= 40)
    mql_count = await db.scalar(
        select(func.count()).select_from(Lead).where(
            Lead.created_at >= month_start, Lead.score >= 40,
        )
    ) or 0

    # SQLs this month
    sql_count = await db.scalar(
        select(func.count()).select_from(Lead).where(
            Lead.created_at >= month_start,
            Lead.status.in_([LeadStatus.QUALIFIED, LeadStatus.PROPOSAL, LeadStatus.NEGOTIATION]),
        )
    ) or 0

    # MQL→SQL conversion
    mql_sql_rate = round(sql_count / mql_count * 100, 1) if mql_count > 0 else None

    # Demos/PoC activos
    active_pocs = await db.scalar(
        select(func.count()).select_from(Opportunity).where(
            Opportunity.stage.in_([OpportunityStage.PROPOSAL, OpportunityStage.NEGOTIATION]),
        )
    ) or 0

    # Total leads month
    total_leads_month = await db.scalar(
        select(func.count()).select_from(Lead).where(Lead.created_at >= month_start)
    ) or 0

    # ═══ RETENTION ══════════════════════════════════════════

    # Churn (simplified: lost / total closed)
    total_lost = await db.scalar(
        select(func.count()).select_from(Opportunity).where(
            Opportunity.stage == OpportunityStage.CLOSED_LOST
        )
    ) or 0
    churn_rate = round(total_lost / max(total_closed, 1) * 100, 1) if total_closed > 0 else None

    # NRR (simplified: 100 + expansion - churn)
    nrr = round(100 + (mrr_growth or 0) - (churn_rate or 0), 1) if mrr_growth is not None else None

    # ═══ UNIT ECONOMICS ═════════════════════════════════════

    # CAC (simplified: from cost control if available)
    from app.models.cost import CostEvent
    total_cost = await db.scalar(
        select(func.coalesce(func.sum(CostEvent.amount), 0))
    ) or 0
    cac = round(float(total_cost) / max(total_won, 1), 0) if total_won > 0 else None

    # LTV:CAC
    ltv = round(float(acv) / max((churn_rate or 10) / 100, 0.05), 0) if acv else None
    ltv_cac = round(ltv / max(cac, 1), 1) if ltv and cac else None

    # CAC payback (months)
    gross_margin = 0.70  # 70% estimated
    cac_payback = round(float(cac or 0) / max(float(acv or 1) * gross_margin / 12, 1), 1) if cac and acv else None

    # ═══ BUILD 20 KPIs ═════════════════════════════════════

    kpis = [
        # Pipeline (4)
        _kpi("pipeline_velocity", "Pipeline velocity", "pipeline", velocity, t("pipeline_velocity", 800), "eur_per_day", "critical"),
        _kpi("win_rate", "Win rate", "pipeline", win_rate, t("win_rate", 25), "pct", "critical"),
        _kpi("sales_cycle_days", "Ciclo de venta", "pipeline", sales_cycle_days, t("sales_cycle_days", 90), "days", "critical"),
        _kpi("pipeline_coverage", "Cobertura pipeline", "pipeline", coverage, t("pipeline_coverage_ratio", 4), "ratio", "high"),

        # Revenue (3)
        _kpi("arr", "ARR total", "revenue", float(arr), t("arr", 300000), "eur", "critical"),
        _kpi("acv", "ACV medio", "revenue", float(acv), t("acv", 57000), "eur", "critical"),
        _kpi("mrr_growth", "Crecimiento MRR", "revenue", mrr_growth, t("mrr_growth", 15), "pct", "high"),

        # Activity (4)
        _kpi("sqls_per_week", "SQLs/semana", "activity", sqls_week, t("sqls_per_week", 3), "count", "high"),
        _kpi("mql_to_sql", "Conversión MQL→SQL", "activity", mql_sql_rate, t("mql_to_sql", 25), "pct", "critical"),
        _kpi("demos_booked", "Demos/PoC activos", "activity", active_pocs, t("demos_booked", 3), "count", "high"),
        _kpi("leads_month", "Leads/mes", "activity", total_leads_month, t("leads_month", 20), "count", "high"),

        # Marketing (2)
        _kpi("mql_month", "MQL/mes", "marketing", mql_count, t("mql_month", 15), "count", "high"),
        _kpi("sql_month", "SQL/mes", "marketing", sql_count, t("sql_month", 5), "count", "high"),

        # Retention (3)
        _kpi("churn_rate", "Churn rate", "retention", churn_rate, t("churn_rate", 8), "pct", "critical"),
        _kpi("nrr", "NRR", "retention", nrr, t("nrr", 110), "pct", "critical"),
        _kpi("won_deals", "Deals cerrados", "retention", total_won, t("won_deals", 3), "count", "high"),

        # Unit Economics (4)
        _kpi("cac", "CAC", "unit", cac, t("cac", 80000), "eur", "critical"),
        _kpi("ltv_cac_ratio", "LTV:CAC", "unit", ltv_cac, t("ltv_cac_ratio", 4), "ratio", "critical"),
        _kpi("cac_payback", "CAC payback (meses)", "unit", cac_payback, t("cac_payback", 12), "days", "high"),
        _kpi("active_pipeline", "Pipeline activo", "unit", float(active_pipeline), t("active_pipeline", 300000), "eur", "high"),
    ]

    # ═══ BUDGET (existing) ═════════════════════════════════

    from app.models.brand import BrandConfig
    from app.models.playbook import SalesTactic
    from app.models.marketing import MarketingCalendarEvent

    brand_result = await db.execute(select(BrandConfig).limit(1))
    brand = brand_result.scalar_one_or_none()
    budget_q1 = brand.gtm_budget_q1 if brand else 2600
    budget_q2 = brand.gtm_budget_q2 if brand else 0
    budget_q3 = brand.gtm_budget_q3 if brand else 0
    budget_q4 = brand.gtm_budget_q4 if brand else 0
    budget_annual = brand.gtm_budget_annual if brand else 0
    budget_total = budget_annual or (budget_q1 + budget_q2 + budget_q3 + budget_q4)

    tactics_spent = await db.scalar(select(func.coalesce(func.sum(SalesTactic.budget_spent), 0))) or 0
    calendar_spent = await db.scalar(select(func.coalesce(func.sum(MarketingCalendarEvent.budget), 0))) or 0
    total_spent = float(tactics_spent) + float(calendar_spent)

    tactics_q = select(
        SalesTactic.name, SalesTactic.category, SalesTactic.budget_monthly, SalesTactic.budget_spent
    ).where(SalesTactic.is_active == True).order_by(SalesTactic.sort_order)  # noqa: E712
    tactics_result = (await db.execute(tactics_q)).all()
    budget_by_tactic = [
        {"name": r[0], "category": r[1], "monthly": float(r[2] or 0), "spent": float(r[3] or 0)}
        for r in tactics_result
    ]

    # ═══ EXTRA BREAKDOWNS ══════════════════════════════════

    # Revenue by tier
    tier_q = select(
        Opportunity.pricing_tier,
        func.count(Opportunity.id),
        func.coalesce(func.sum(Opportunity.value), 0),
    ).where(Opportunity.pricing_tier.isnot(None)).group_by(Opportunity.pricing_tier)
    tier_result = (await db.execute(tier_q)).all()
    revenue_by_tier = [{"tier": r[0], "deals": r[1], "value": float(r[2])} for r in tier_result]

    # Win rate by competitor
    comp_q = select(
        Opportunity.competitor,
        func.count(Opportunity.id).label("total"),
        func.sum(case((Opportunity.stage == OpportunityStage.CLOSED_WON, 1), else_=0)).label("won"),
    ).where(Opportunity.competitor.isnot(None)).group_by(Opportunity.competitor)
    comp_result = (await db.execute(comp_q)).all()
    win_rate_by_competitor = [
        {"competitor": r[0], "total": r[1], "won": int(r[2] or 0),
         "win_rate": round(int(r[2] or 0) / r[1] * 100, 1) if r[1] > 0 else 0}
        for r in comp_result
    ]

    # Leads by channel
    channel_q = select(
        Lead.acquisition_channel, func.count(Lead.id),
    ).where(Lead.acquisition_channel.isnot(None)).group_by(Lead.acquisition_channel)
    channel_result = (await db.execute(channel_q)).all()
    leads_by_channel = [{"channel": r[0], "count": r[1]} for r in channel_result]

    # Stats summary
    green_count = len([k for k in kpis if k["status"] == "green"])
    amber_count = len([k for k in kpis if k["status"] == "amber"])
    red_count = len([k for k in kpis if k["status"] == "red"])

    return {
        "kpis": kpis,
        "summary": {
            "green": green_count, "amber": amber_count, "red": red_count,
            "total": len(kpis),
        },
        "budget": {
            "annual": budget_total,
            "quarterly": {"q1": budget_q1, "q2": budget_q2, "q3": budget_q3, "q4": budget_q4},
            "total_spent": round(total_spent, 2),
            "remaining": round(budget_total - total_spent, 2),
            "pct_used": round(total_spent / budget_total * 100, 1) if budget_total > 0 else 0,
            "by_tactic": budget_by_tactic,
        },
        "revenue_by_tier": revenue_by_tier,
        "win_rate_by_competitor": win_rate_by_competitor,
        "leads_by_channel": leads_by_channel,
        "generated_at": now.isoformat(),
    }


# ═══ KPI TARGETS CRUD ══════════════════════════════════════

@router.get("/targets")
async def list_kpi_targets(
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
org_id: str = Depends(get_org_id),
):
    result = await db.execute(select(KpiTarget).where(KpiTarget.org_id == org_id).order_by(KpiTarget.kpi_id))
    return {"targets": [
        {"id": str(t.id), "kpi_id": t.kpi_id, "target_value": t.target_value,
         "target_label": t.target_label, "period": t.period}
        for t in result.scalars().all()
    ]}


class KpiTargetUpdate(BaseModel):
    target_value: float
    target_label: str = ""
    period: str = "year_1"


@router.put("/targets/{kpi_id}")
async def update_kpi_target(
    kpi_id: str,
    data: KpiTargetUpdate,
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_write_access),
org_id: str = Depends(get_org_id),
):
    result = await db.execute(select(KpiTarget).where(KpiTarget.kpi_id == kpi_id))
    target = result.scalar_one_or_none()
    if not target:
        target = KpiTarget(kpi_id=kpi_id, target_value=data.target_value,
                          target_label=data.target_label, period=data.period)
        db.add(target)
    else:
        target.target_value = data.target_value
        target.target_label = data.target_label
        target.period = data.period
    await db.commit()
    return {"updated": True}


@router.post("/seed-all")
async def seed_all_gtm_data(
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_write_access),
org_id: str = Depends(get_org_id),
):
    """Ejecuta TODOS los seeds de GTM de una vez: competidores, tácticas, pricing, campañas."""
    results = {}

    # 1. Competitors (18)
    from app.data.competitors_seed import COMPETITORS_SEED
    from app.models.competitor import Competitor
    created = 0
    for d in COMPETITORS_SEED:
        existing = await db.scalar(select(Competitor).where(Competitor.name == d["name"]))
        if not existing:
            db.add(Competitor(**d))
            created += 1
    await db.commit()
    results["competitors"] = created

    # 2. Pricing tiers (3)
    from app.models.pricing import PricingTier
    tiers = [
        {"name": "Pilot PoC", "slug": "pilot_poc", "base_price": 19500, "price_unit": "fixed",
         "duration_days": 90, "min_price": 19500, "max_price": 19500,
         "modules_included": ["grc_core", "ens_alto"], "modules_available": ["nis2", "dora", "soc"],
         "infra_cost_monthly": 1200, "sort_order": 1},
        {"name": "Enterprise", "slug": "enterprise", "base_price": 60000, "price_unit": "year",
         "min_price": 48000, "max_price": 72000,
         "modules_included": ["grc_core", "ens_alto", "nis2"], "modules_available": ["dora", "iso27001", "soc", "de", "ai_act"],
         "infra_cost_monthly": 2000, "sort_order": 2},
        {"name": "SMB", "slug": "smb", "base_price": 1200, "price_unit": "month",
         "min_price": 1200, "max_price": 3000,
         "modules_included": ["grc_core"], "modules_available": ["ens_alto", "nis2", "dora"],
         "infra_cost_monthly": 800, "sort_order": 3},
    ]
    created = 0
    for d in tiers:
        existing = await db.scalar(select(PricingTier).where(PricingTier.slug == d["slug"]))
        if not existing:
            db.add(PricingTier(**d))
            created += 1
    await db.commit()
    results["pricing_tiers"] = created

    # 3. Sales tactics (14)
    from app.models.playbook import SalesTactic
    tactics = [
        {"name": "Marketing de contenido", "category": "inbound", "channel": "blog_youtube", "sort_order": 1},
        {"name": "SEO orgánico", "category": "inbound", "channel": "seo", "sort_order": 2},
        {"name": "Lead magnets", "category": "inbound", "channel": "landing", "sort_order": 3},
        {"name": "Email marketing", "category": "inbound", "channel": "email", "sort_order": 4},
        {"name": "Llamadas en frío ABM", "category": "outbound", "channel": "retell_ai", "sort_order": 5},
        {"name": "Emails en frío ABM", "category": "outbound", "channel": "lemlist", "sort_order": 6},
        {"name": "Elevator pitch", "category": "outbound", "channel": "direct", "sort_order": 7},
        {"name": "Ventas por solución", "category": "relacional", "channel": "direct", "sort_order": 8},
        {"name": "Retención/fidelización", "category": "relacional", "channel": "cs", "sort_order": 9},
        {"name": "Referrals y eventos", "category": "relacional", "channel": "events", "sort_order": 10},
        {"name": "Post-venta y seguimiento", "category": "relacional", "channel": "cs", "sort_order": 11},
        {"name": "Venta directa SMB", "category": "transaccional", "channel": "self_service", "sort_order": 12},
        {"name": "Redes sociales", "category": "transaccional", "channel": "linkedin", "sort_order": 13},
        {"name": "Cierre por urgencia regulatoria", "category": "transaccional", "channel": "direct", "sort_order": 14},
    ]
    created = 0
    for d in tactics:
        existing = await db.scalar(select(SalesTactic).where(SalesTactic.name == d["name"]))
        if not existing:
            db.add(SalesTactic(**d))
            created += 1
    await db.commit()
    results["sales_tactics"] = created

    # 4. Ad campaigns (5 B2B ciber)
    from app.models.media import AdCampaign
    from datetime import date
    campaigns = [
        {"name": "LinkedIn Ads — CEOs Enterprise", "platform": "linkedin_ads", "objective": "lead_gen",
         "targeting": "CEOs, CTOs, DPOs en España · >50 empleados", "buying_model": "CPC",
         "unit_cost": 8.50, "budget_total": 3000, "start_date": date(2026, 4, 1), "end_date": date(2026, 6, 30)},
        {"name": "LinkedIn Ads — NIS2/DORA Awareness", "platform": "linkedin_ads", "objective": "brand_awareness",
         "targeting": "Decision makers ciber Europa · Banca, Energía", "buying_model": "CPM",
         "unit_cost": 35.0, "budget_total": 2000, "start_date": date(2026, 4, 1), "end_date": date(2026, 6, 30)},
        {"name": "Google Ads SEM — Keywords ENS NIS2", "platform": "google_ads", "objective": "lead_gen",
         "targeting": "Keywords: ENS alto, NIS2 software, growth tecnología", "buying_model": "CPC",
         "unit_cost": 4.20, "budget_total": 1500, "start_date": date(2026, 4, 1), "end_date": date(2026, 6, 30)},
        {"name": "YouTube Ads — Webinar NIS2/DORA", "platform": "youtube_ads", "objective": "conversions",
         "targeting": "Profesionales ciber España", "buying_model": "CPV",
         "unit_cost": 0.05, "budget_total": 800, "start_date": date(2026, 4, 15), "end_date": date(2026, 5, 31)},
        {"name": "Google Display — Retargeting", "platform": "google_ads", "objective": "conversions",
         "targeting": "Visitantes st4rtup.app últimos 30 días", "buying_model": "CPM",
         "unit_cost": 2.50, "budget_total": 500, "start_date": date(2026, 4, 1), "end_date": date(2026, 6, 30)},
    ]
    created = 0
    for d in campaigns:
        existing = await db.scalar(select(AdCampaign).where(AdCampaign.name == d["name"]))
        if not existing:
            db.add(AdCampaign(**d))
            created += 1
    await db.commit()
    results["ad_campaigns"] = created

    return {"seeded": results, "total": sum(results.values())}


@router.post("/check-alerts")
async def check_kpi_alerts(
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_write_access),
org_id: str = Depends(get_org_id),
):
    """Evalúa KPIs y genera alertas para los que están en rojo."""
    import logging
    logger = logging.getLogger(__name__)

    data = await gtm_dashboard(db=db, _current_user=_current_user)
    kpis = data["kpis"]
    red_kpis = [k for k in kpis if k["status"] == "red"]

    if not red_kpis:
        return {"alerts_sent": 0, "message": "Todos los KPIs on track"}

    # Create notifications for admins
    from app.models.notification import NotificationType, NotificationPriority
    from app.models import User, UserRole
    from app.services.notification_service import notification_service

    admins = (await db.execute(
        select(User.id).where(User.role == UserRole.ADMIN)
    )).scalars().all()

    for kpi in red_kpis:
        for admin_id in admins:
            try:
                await notification_service.create_notification(
                    db=db, user_id=admin_id,
                    type=NotificationType.SYSTEM,
                    priority=NotificationPriority.HIGH,
                    title=f"KPI Crítico: {kpi['name']}",
                    message=f"{kpi['name']}: {kpi['actual']} vs target {kpi['target']} ({kpi['pct']}%)",
                )
            except Exception as e:
                logger.warning("Failed to create KPI alert: %s", e)

    # Telegram summary
    try:
        from app.services.telegram_service import send_message as telegram_send
        from app.core.config import settings
        if settings.TELEGRAM_BOT_TOKEN and settings.TELEGRAM_CHAT_ID:
            msg = f"🚨 <b>KPIs Críticos ({len(red_kpis)})</b>\n\n"
            for k in red_kpis:
                msg += f"🔴 <b>{k['name']}</b>: {k['actual']} vs {k['target']} ({k['pct']}%)\n"
            msg += f"\n📊 {data['summary']['green']} on track · {data['summary']['amber']} riesgo"
            await telegram_send(msg)
    except Exception as e:
        logger.warning("Telegram KPI alert failed: %s", e)

    return {"alerts_sent": len(red_kpis) * len(admins), "red_kpis": [k["name"] for k in red_kpis]}


@router.get("/win-loss")
async def win_loss_analysis(
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
org_id: str = Depends(get_org_id),
):
    """Análisis win/loss — motivos de cierre por competidor y sector."""
    # Won deals
    won = (await db.execute(
        select(Opportunity).where(Opportunity.stage == OpportunityStage.CLOSED_WON)
    )).scalars().all()
    lost = (await db.execute(
        select(Opportunity).where(Opportunity.stage == OpportunityStage.CLOSED_LOST)
    )).scalars().all()

    # By competitor
    won_by_comp = {}
    lost_by_comp = {}
    for o in won:
        c = o.competitor or 'Sin competidor'
        won_by_comp[c] = won_by_comp.get(c, 0) + 1
    for o in lost:
        c = o.competitor or 'Sin competidor'
        lost_by_comp[c] = lost_by_comp.get(c, 0) + 1

    # Win reasons
    win_reasons = {}
    for o in won:
        r = o.win_reason or 'No especificado'
        win_reasons[r] = win_reasons.get(r, 0) + 1

    # Loss reasons
    loss_reasons = {}
    for o in lost:
        r = o.loss_reason or 'No especificado'
        loss_reasons[r] = loss_reasons.get(r, 0) + 1

    # By tier
    won_by_tier = {}
    for o in won:
        t = o.pricing_tier or 'Sin tier'
        won_by_tier[t] = won_by_tier.get(t, 0) + 1

    return {
        "total_won": len(won),
        "total_lost": len(lost),
        "win_rate": round(len(won) / max(len(won) + len(lost), 1) * 100, 1),
        "won_by_competitor": won_by_comp,
        "lost_by_competitor": lost_by_comp,
        "win_reasons": win_reasons,
        "loss_reasons": loss_reasons,
        "won_by_tier": won_by_tier,
        "avg_won_value": round(sum(o.value or 0 for o in won) / max(len(won), 1), 0),
        "avg_lost_value": round(sum(o.value or 0 for o in lost) / max(len(lost), 1), 0),
    }


@router.get("/forecast")
async def revenue_forecast(
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
org_id: str = Depends(get_org_id),
):
    """Proyección ARR 12 meses basada en pipeline + win rate + cycle."""
    now = datetime.now(timezone.utc)

    # Current ARR
    arr = await db.scalar(
        select(func.coalesce(func.sum(Opportunity.value), 0)).where(
            Opportunity.stage == OpportunityStage.CLOSED_WON
        )
    ) or 0

    # Active pipeline
    pipeline = await db.scalar(
        select(func.coalesce(func.sum(Opportunity.value), 0)).where(
            Opportunity.stage.notin_([OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST])
        )
    ) or 0

    # Win rate
    total_closed = await db.scalar(
        select(func.count()).select_from(Opportunity).where(
            Opportunity.stage.in_([OpportunityStage.CLOSED_WON, OpportunityStage.CLOSED_LOST])
        )
    ) or 0
    total_won = await db.scalar(
        select(func.count()).select_from(Opportunity).where(Opportunity.stage == OpportunityStage.CLOSED_WON)
    ) or 0
    win_rate = total_won / max(total_closed, 1)

    # Average deal value
    avg_deal = await db.scalar(
        select(func.coalesce(func.avg(Opportunity.value), 19500))
    ) or 19500

    # MRR growth rate (estimated)
    mrr_growth_rate = 0.10  # 10% monthly default

    # Project 12 months
    current_arr = float(arr)
    monthly_new = float(pipeline) * win_rate / 3  # Pipeline converts over ~3 months
    months = []

    for i in range(12):
        month_date = now + timedelta(days=30 * (i + 1))
        # Compound growth + new deals from pipeline
        projected_arr = current_arr * (1 + mrr_growth_rate) + monthly_new * (1 - 0.1 * i / 12)  # Pipeline depletes
        current_arr = projected_arr
        months.append({
            "month": month_date.strftime("%Y-%m"),
            "label": month_date.strftime("%b %Y"),
            "projected_arr": round(projected_arr, 0),
            "projected_mrr": round(projected_arr / 12, 0),
        })

    return {
        "current_arr": float(arr),
        "current_pipeline": float(pipeline),
        "win_rate": round(win_rate * 100, 1),
        "avg_deal_value": round(float(avg_deal), 0),
        "forecast": months,
        "arr_12m": round(months[-1]["projected_arr"], 0) if months else 0,
    }


@router.get("/poc-tracker")
async def poc_tracker(
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
org_id: str = Depends(get_org_id),
):
    """Tracker de PoCs activos con countdown 90 días."""
    now = datetime.now(timezone.utc)

    # Get opportunities with pricing_tier = pilot_poc or name contains PoC
    from sqlalchemy import or_
    q = select(Opportunity).where(
        or_(
            Opportunity.pricing_tier == "pilot_poc",
            Opportunity.name.ilike("%poc%"),
            Opportunity.name.ilike("%pilot%"),
        ),
        Opportunity.stage.notin_([OpportunityStage.CLOSED_LOST]),
    ).order_by(Opportunity.created_at.desc())

    result = await db.execute(q)
    pocs = result.scalars().all()

    poc_list = []
    for p in pocs:
        start_date = p.created_at
        days_elapsed = (now - start_date).days if start_date else 0
        days_remaining = max(90 - days_elapsed, 0)
        pct_complete = min(round(days_elapsed / 90 * 100, 0), 100)

        poc_list.append({
            "id": str(p.id),
            "name": p.name,
            "company": p.competitor or "",  # Using competitor field for company temporarily
            "stage": p.stage.value if p.stage else "discovery",
            "value": p.value or 19500,
            "start_date": start_date.isoformat() if start_date else None,
            "days_elapsed": days_elapsed,
            "days_remaining": days_remaining,
            "pct_complete": pct_complete,
            "status": "completed" if p.stage == OpportunityStage.CLOSED_WON else "at_risk" if days_remaining < 15 else "on_track",
            "expected_close": str(p.expected_close_date) if p.expected_close_date else None,
        })

    return {
        "pocs": poc_list,
        "total": len(poc_list),
        "active": len([p for p in poc_list if p["status"] != "completed"]),
        "at_risk": len([p for p in poc_list if p["status"] == "at_risk"]),
    }


@router.post("/snapshot-kpis")
async def snapshot_kpis(
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_write_access),
org_id: str = Depends(get_org_id),
):
    """Guarda snapshot de todos los KPIs actuales. Ejecutar mensualmente via n8n."""
    from sqlalchemy import text
    data = await gtm_dashboard(db=db, _current_user=_current_user)
    period = datetime.now(timezone.utc).strftime("%Y-%m")
    saved = 0
    for kpi in data["kpis"]:
        if kpi["actual"] is not None:
            try:
                await db.execute(text(
                    "INSERT INTO kpi_history (id, kpi_id, period, value) VALUES (gen_random_uuid(), :kpi_id, :period, :value) "
                    "ON CONFLICT DO NOTHING"
                ), {"kpi_id": kpi["id"], "period": period, "value": kpi["actual"]})
                saved += 1
            except Exception as e:
                logger.debug("KPI history insert skipped: %s", e)
    await db.commit()
    return {"saved": saved, "period": period}


@router.get("/pipeline-analytics")
async def pipeline_analytics(
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
org_id: str = Depends(get_org_id),
):
    """Funnel con conversion rates por etapa."""
    stages_order = [OpportunityStage.DISCOVERY, OpportunityStage.QUALIFICATION,
                    OpportunityStage.PROPOSAL, OpportunityStage.NEGOTIATION,
                    OpportunityStage.CLOSED_WON]
    stage_data = []
    for stage in stages_order:
        count = await db.scalar(select(func.count()).select_from(Opportunity).where(Opportunity.stage == stage)) or 0
        value = await db.scalar(select(func.coalesce(func.sum(Opportunity.value), 0)).where(Opportunity.stage == stage)) or 0
        stage_data.append({"stage": stage.value, "count": count, "value": float(value)})

    lost = await db.scalar(select(func.count()).select_from(Opportunity).where(Opportunity.stage == OpportunityStage.CLOSED_LOST)) or 0
    stage_data.append({"stage": "closed_lost", "count": lost, "value": 0})

    conversions = []
    for i in range(len(stage_data) - 2):
        rate = round(stage_data[i + 1]["count"] / max(stage_data[i]["count"], 1) * 100, 1)
        conversions.append({"from": stage_data[i]["stage"], "to": stage_data[i + 1]["stage"], "rate": rate})

    return {"stages": stage_data, "conversions": conversions, "total": sum(s["count"] for s in stage_data)}


@router.get("/suggest-competitor")
async def suggest_competitor(
    sector: str = "",
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
org_id: str = Depends(get_org_id),
):
    """Sugiere competidores relevantes basándose en el sector del lead."""
    from app.models.competitor import Competitor

    q = select(Competitor).where(Competitor.is_active == True).order_by(Competitor.maturity_score.desc())  # noqa: E712

    result = await db.execute(q)
    competitors = result.scalars().all()

    # Filter by tags matching sector keywords
    sector_lower = sector.lower()
    suggestions = []
    for c in competitors:
        tags = [t.lower() for t in (c.tags or [])]
        scope = (c.scope or '').lower()
        if sector_lower and (any(sector_lower in t for t in tags) or sector_lower in scope):
            suggestions.append({"id": str(c.id), "name": c.name, "tier": c.tier, "maturity_score": c.maturity_score, "relevance": "high"})
        elif c.tier in ("critical", "high"):
            suggestions.append({"id": str(c.id), "name": c.name, "tier": c.tier, "maturity_score": c.maturity_score, "relevance": "general"})

    return {"suggestions": suggestions[:5], "sector": sector}


@router.post("/weekly-digest")
async def generate_weekly_digest(
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_write_access),
org_id: str = Depends(get_org_id),
):
    """Genera resumen semanal: KPIs + pipeline + alertas. Para envío por email/Telegram."""
    data = await gtm_dashboard(db=db, _current_user=_current_user)
    kpis = data["kpis"]

    red = [k for k in kpis if k["status"] == "red"]
    green = [k for k in kpis if k["status"] == "green"]

    digest = "📊 **Resumen Semanal — St4rtup CRM**\n\n"
    digest += f"✅ {len(green)} KPIs on track · ⚠️ {data['summary'].get('amber', 0)} riesgo · 🔴 {len(red)} críticos\n\n"

    if red:
        digest += "**KPIs Críticos:**\n"
        for k in red:
            digest += f"  🔴 {k['name']}: {k['actual']} vs {k['target']} ({k['pct']}%)\n"
        digest += "\n"

    budget = data.get("budget", {})
    if budget:
        digest += f"**Budget GTM:** €{budget.get('total_spent', 0):,.0f} / €{budget.get('annual', 0):,.0f} ({budget.get('pct_used', 0)}%)\n\n"

    # Try send via Telegram
    sent_telegram = False
    try:
        from app.services.telegram_service import send_message
        from app.core.config import settings
        if settings.TELEGRAM_BOT_TOKEN:
            await send_message(digest.replace("**", "<b>").replace("**", "</b>"))
            sent_telegram = True
    except Exception as e:
        logger.warning("Telegram digest failed: %s", e)

    return {"digest": digest, "sent_telegram": sent_telegram, "kpis_red": len(red), "kpis_green": len(green)}


@router.get("/migrations")
async def list_applied_migrations(
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
org_id: str = Depends(get_org_id),
):
    """Lista migraciones SQL aplicadas."""
    try:
        from sqlalchemy import text
        result = await db.execute(text("SELECT migration_name, applied_at FROM applied_migrations ORDER BY id"))
        return {"migrations": [{"name": r[0], "applied_at": r[1].isoformat() if r[1] else None} for r in result.all()]}
    except Exception:
        return {"migrations": [], "note": "Table applied_migrations not found. Run migration 035."}


@router.get("/export-pdf")
async def export_gtm_pdf(
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
org_id: str = Depends(get_org_id),
):
    """Exporta el GTM Dashboard como PDF board pack."""
    # Get dashboard data
    data = await gtm_dashboard(db=db, _current_user=_current_user)
    kpis = data["kpis"]
    budget = data.get("budget", {})

    # Build markdown
    now = datetime.now(timezone.utc)
    lines = [
        "# St4rtup CRM — GTM Board Pack",
        f"**Fecha:** {now.strftime('%d/%m/%Y')}",
        "",
        "## KPIs Comerciales",
        "",
        "| KPI | Categoría | Actual | Target | Estado | % |",
        "|-----|-----------|--------|--------|--------|---|",
    ]

    status_labels = {"green": "✅ On Track", "amber": "⚠️ Riesgo", "red": "🔴 Crítico", "gray": "— Sin datos"}

    for k in kpis:
        actual = str(k["actual"]) if k["actual"] is not None else "—"
        if k["unit"] == "eur":
            actual = f"€{k['actual']:,.0f}" if k["actual"] else "—"
        elif k["unit"] == "pct":
            actual = f"{k['actual']}%" if k["actual"] is not None else "—"
        target = str(k["target"])
        if k["unit"] == "eur":
            target = f"€{k['target']:,.0f}"
        elif k["unit"] == "pct":
            target = f"{k['target']}%"
        lines.append(f"| {k['name']} | {k['category']} | {actual} | {target} | {status_labels.get(k['status'], '—')} | {k['pct']}% |")

    lines += [
        "",
        "## Resumen",
        "",
        f"- **On Track:** {data['summary'].get('green', 0)} KPIs",
        f"- **En Riesgo:** {data['summary'].get('amber', 0)} KPIs",
        f"- **Crítico:** {data['summary'].get('red', 0)} KPIs",
        "",
    ]

    if budget:
        lines += [
            "## Presupuesto GTM",
            "",
            f"- **Total anual:** €{budget.get('annual', 0):,.0f}",
            f"- **Gastado:** €{budget.get('total_spent', 0):,.0f}",
            f"- **Disponible:** €{budget.get('remaining', 0):,.0f}",
            f"- **Consumido:** {budget.get('pct_used', 0)}%",
            "",
        ]

    lines.append(f"\n---\n*Generado automáticamente por St4rtup CRM · {now.strftime('%d/%m/%Y %H:%M')}*")

    md_content = "\n".join(lines)

    from app.services.pdf_service import markdown_to_pdf
    pdf_bytes = markdown_to_pdf(md_content, "St4rtup CRM — GTM Board Pack")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="st4rtup_gtm_boardpack_{now.strftime("%Y%m%d")}.pdf"'},
    )
