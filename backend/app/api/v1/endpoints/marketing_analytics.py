"""Endpoint de analytics unificado para Marketing Hub."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case, desc

from app.core.database import get_db
from app.core.tenant import get_org_id
from app.core.security import get_current_user
from app.models.marketing import (
    Campaign, Funnel, MarketingAsset, UTMCode,
    MarketingCalendarEvent, MarketingAlert,
)
from app.models.enums import CampaignStatus

router = APIRouter()


@router.get("/overview")
async def get_marketing_overview(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Dashboard de analytics de marketing — métricas agregadas."""

    # ─── Campaigns: totals by status ────────────────────────────
    campaign_status_q = (
        select(Campaign.status, func.count(Campaign.id))
        .group_by(Campaign.status)
    )
    status_result = await db.execute(campaign_status_q)
    campaigns_by_status = {}
    total_campaigns = 0
    for row in status_result.all():
        key = row[0].value if row[0] else "unknown"
        campaigns_by_status[key] = row[1]
        total_campaigns += row[1]

    # ─── Campaigns: budget totals ───────────────────────────────
    budget_q = select(
        func.coalesce(func.sum(Campaign.budget_total), 0),
        func.coalesce(func.sum(
            case((Campaign.status == CampaignStatus.ACTIVE, Campaign.budget_total), else_=0)
        ), 0),
        func.coalesce(func.sum(Campaign.leads_goal), 0),
        func.coalesce(func.sum(Campaign.mqls_goal), 0),
    )
    budget_result = (await db.execute(budget_q)).one()
    total_budget = float(budget_result[0])
    active_budget = float(budget_result[1])
    total_leads_goal = int(budget_result[2])
    total_mqls_goal = int(budget_result[3])

    # ─── Campaigns: by channel ──────────────────────────────────
    channel_q = (
        select(Campaign.channel, func.count(Campaign.id))
        .group_by(Campaign.channel)
    )
    channel_result = await db.execute(channel_q)
    campaigns_by_channel = {
        row[0].value if row[0] else "unknown": row[1]
        for row in channel_result.all()
    }

    # ─── Campaigns: by objective ────────────────────────────────
    objective_q = (
        select(Campaign.objective, func.count(Campaign.id))
        .group_by(Campaign.objective)
    )
    objective_result = await db.execute(objective_q)
    campaigns_by_objective = {
        row[0].value if row[0] else "unknown": row[1]
        for row in objective_result.all()
    }

    # ─── Assets: totals + metrics ───────────────────────────────
    assets_q = select(
        func.count(MarketingAsset.id),
        func.coalesce(func.sum(MarketingAsset.visits), 0),
        func.coalesce(func.sum(MarketingAsset.conversions), 0),
        func.coalesce(func.sum(MarketingAsset.impressions), 0),
        func.coalesce(func.sum(MarketingAsset.clicks), 0),
    )
    assets_result = (await db.execute(assets_q)).one()
    total_assets = assets_result[0]
    total_visits = int(assets_result[1])
    total_conversions = int(assets_result[2])
    total_impressions = int(assets_result[3])
    total_clicks = int(assets_result[4])

    # ─── Other counts ───────────────────────────────────────────
    total_funnels = await db.scalar(select(func.count()).select_from(Funnel)) or 0
    total_utm = await db.scalar(select(func.count()).select_from(UTMCode)) or 0
    total_events = await db.scalar(select(func.count()).select_from(MarketingCalendarEvent)) or 0
    total_alerts = await db.scalar(select(func.count()).select_from(MarketingAlert)) or 0
    unread_alerts = await db.scalar(
        select(func.count()).select_from(MarketingAlert).where(MarketingAlert.is_read.is_(False))
    ) or 0

    # ─── Derived metrics ────────────────────────────────────────
    conversion_rate = (total_conversions / total_visits * 100) if total_visits > 0 else 0
    ctr = (total_clicks / total_impressions * 100) if total_impressions > 0 else 0
    active_campaigns = campaigns_by_status.get("active", 0)
    cpl_avg = (active_budget / total_leads_goal) if total_leads_goal > 0 else 0

    # ─── Budget by channel ──────────────────────────────────────
    budget_by_channel_q = (
        select(Campaign.channel, func.coalesce(func.sum(Campaign.budget_total), 0))
        .group_by(Campaign.channel)
    )
    budget_ch_result = await db.execute(budget_by_channel_q)
    budget_by_channel = {
        (row[0].value if row[0] else "unknown"): round(float(row[1]), 2)
        for row in budget_ch_result.all()
    }

    # ─── Top campaigns by budget ──────────────────────────────
    top_campaigns_q = (
        select(Campaign.name, Campaign.channel, Campaign.status, Campaign.budget_total, Campaign.leads_goal)
        .order_by(desc(Campaign.budget_total))
        .limit(10)
    )
    top_result = await db.execute(top_campaigns_q)
    top_campaigns = [
        {
            "name": row[0],
            "channel": row[1].value if row[1] else "unknown",
            "status": row[2].value if row[2] else "unknown",
            "budget": float(row[3] or 0),
            "leads_goal": int(row[4] or 0),
            "cpl": round(float(row[3] or 0) / max(int(row[4] or 0), 1), 2),
        }
        for row in top_result.all()
    ]

    # ─── Campaigns by persona_target ──────────────────────────
    persona_q = (
        select(Campaign.persona_target, func.count(Campaign.id))
        .where(Campaign.persona_target.isnot(None))
        .group_by(Campaign.persona_target)
    )
    persona_result = await db.execute(persona_q)
    by_persona = {row[0]: row[1] for row in persona_result.all()}

    # ─── Campaigns by regulatory_focus ────────────────────────
    regulatory_q = (
        select(Campaign.regulatory_focus, func.count(Campaign.id))
        .where(Campaign.regulatory_focus.isnot(None))
        .group_by(Campaign.regulatory_focus)
    )
    regulatory_result = await db.execute(regulatory_q)
    by_regulatory = {row[0]: row[1] for row in regulatory_result.all()}

    # ─── Assets by type ───────────────────────────────────────
    asset_type_q = (
        select(MarketingAsset.type, func.count(MarketingAsset.id))
        .group_by(MarketingAsset.type)
    )
    asset_type_result = await db.execute(asset_type_q)
    assets_by_type = {
        (row[0].value if row[0] else "unknown"): row[1]
        for row in asset_type_result.all()
    }

    # ─── Assets by language ───────────────────────────────────
    asset_lang_q = (
        select(MarketingAsset.language, func.count(MarketingAsset.id))
        .where(MarketingAsset.language.isnot(None))
        .group_by(MarketingAsset.language)
    )
    asset_lang_result = await db.execute(asset_lang_q)
    assets_by_language = {
        (row[0].value if hasattr(row[0], 'value') else str(row[0])): row[1]
        for row in asset_lang_result.all()
    }

    # ─── Top assets by visits ─────────────────────────────────
    top_assets_q = (
        select(MarketingAsset.name, MarketingAsset.type, MarketingAsset.visits,
               MarketingAsset.conversions, MarketingAsset.impressions, MarketingAsset.clicks)
        .order_by(desc(MarketingAsset.visits))
        .limit(10)
    )
    top_assets_result = await db.execute(top_assets_q)
    top_assets = [
        {
            "name": row[0],
            "type": row[1].value if row[1] else "unknown",
            "visits": int(row[2] or 0),
            "conversions": int(row[3] or 0),
            "impressions": int(row[4] or 0),
            "clicks": int(row[5] or 0),
            "conv_rate": round((int(row[3] or 0) / max(int(row[2] or 0), 1)) * 100, 2),
            "ctr": round((int(row[5] or 0) / max(int(row[4] or 0), 1)) * 100, 2),
        }
        for row in top_assets_result.all()
    ]

    # ─── Alerts by type ───────────────────────────────────────
    alert_type_q = (
        select(MarketingAlert.alert_type, func.count(MarketingAlert.id))
        .group_by(MarketingAlert.alert_type)
    )
    alert_type_result = await db.execute(alert_type_q)
    alerts_by_type = {row[0]: row[1] for row in alert_type_result.all()}

    return {
        "campaigns": {
            "total": total_campaigns,
            "by_status": campaigns_by_status,
            "by_channel": campaigns_by_channel,
            "by_objective": campaigns_by_objective,
            "active": active_campaigns,
        },
        "budget": {
            "total": total_budget,
            "active": active_budget,
            "cpl_avg": round(cpl_avg, 2),
            "by_channel": budget_by_channel,
        },
        "goals": {
            "leads_goal": total_leads_goal,
            "mqls_goal": total_mqls_goal,
        },
        "assets": {
            "total": total_assets,
            "visits": total_visits,
            "conversions": total_conversions,
            "impressions": total_impressions,
            "clicks": total_clicks,
            "conversion_rate": round(conversion_rate, 2),
            "ctr": round(ctr, 2),
            "by_type": assets_by_type,
            "by_language": assets_by_language,
            "top": top_assets,
        },
        "counts": {
            "funnels": total_funnels,
            "utm_codes": total_utm,
            "calendar_events": total_events,
            "alerts_total": total_alerts,
            "alerts_unread": unread_alerts,
        },
        "targeting": {
            "by_persona": by_persona,
            "by_regulatory": by_regulatory,
        },
        "top_campaigns": top_campaigns,
        "alerts_by_type": alerts_by_type,
    }
