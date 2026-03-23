"""Alert engine: auto-generates marketing alerts based on campaign/asset metrics."""
import logging
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.marketing import Campaign, MarketingAsset, MarketingAlert
from app.models.enums import CampaignStatus, AlertSeverity

logger = logging.getLogger(__name__)


async def run_alert_engine(db: AsyncSession) -> dict:
    """
    Analiza campañas y assets para generar alertas automáticas.
    Returns dict con el resumen de alertas generadas.
    """
    alerts_created = []

    # 1. Campañas con CPL alto (por encima del max_cpl configurado)
    result = await db.execute(
        select(Campaign).where(
            Campaign.status == CampaignStatus.ACTIVE,
            Campaign.max_cpl.isnot(None),
            Campaign.max_cpl > 0,
            Campaign.budget_total > 0,
            Campaign.leads_goal > 0,
        )
    )
    campaigns = result.scalars().all()

    for campaign in campaigns:
        current_cpl = campaign.budget_total / max(campaign.leads_goal, 1)
        if current_cpl > campaign.max_cpl:
            alert = await _create_alert_if_not_exists(
                db,
                alert_type="cpl_threshold",
                severity=AlertSeverity.CRITICAL if current_cpl > campaign.max_cpl * 1.5 else AlertSeverity.WARNING,
                entity_type="campaign",
                entity_id=campaign.id,
                entity_name=campaign.name,
                message=f"CPL actual ({current_cpl:.2f}€) supera el umbral ({campaign.max_cpl:.2f}€) en la campaña '{campaign.name}'",
                threshold_value=campaign.max_cpl,
                actual_value=current_cpl,
            )
            if alert:
                alerts_created.append("cpl_threshold")

    # 2. Campañas activas sin actualización en N días (stale)
    stale_threshold = datetime.now(timezone.utc) - timedelta(days=14)
    result = await db.execute(
        select(Campaign).where(
            Campaign.status == CampaignStatus.ACTIVE,
            Campaign.updated_at < stale_threshold,
        )
    )
    stale_campaigns = result.scalars().all()

    for campaign in stale_campaigns:
        days_stale = (datetime.now(timezone.utc) - campaign.updated_at).days
        alert = await _create_alert_if_not_exists(
            db,
            alert_type="stale_campaign",
            severity=AlertSeverity.WARNING if days_stale < 30 else AlertSeverity.CRITICAL,
            entity_type="campaign",
            entity_id=campaign.id,
            entity_name=campaign.name,
            message=f"Campaña '{campaign.name}' sin actualizar desde hace {days_stale} días",
            threshold_value=14,
            actual_value=days_stale,
        )
        if alert:
            alerts_created.append("stale_campaign")

    # 3. Campañas activas con fecha fin pasada
    today = datetime.now(timezone.utc).date()
    result = await db.execute(
        select(Campaign).where(
            Campaign.status == CampaignStatus.ACTIVE,
            Campaign.end_date.isnot(None),
            Campaign.end_date < today,
        )
    )
    expired_campaigns = result.scalars().all()

    for campaign in expired_campaigns:
        alert = await _create_alert_if_not_exists(
            db,
            alert_type="campaign_expired",
            severity=AlertSeverity.CRITICAL,
            entity_type="campaign",
            entity_id=campaign.id,
            entity_name=campaign.name,
            message=f"Campaña '{campaign.name}' tiene fecha fin {campaign.end_date} pero sigue activa",
        )
        if alert:
            alerts_created.append("campaign_expired")

    # 4. Campañas con budget alto y 0 leads
    result = await db.execute(
        select(Campaign).where(
            Campaign.status == CampaignStatus.ACTIVE,
            Campaign.budget_total > 1000,
            Campaign.leads_goal == 0,
        )
    )
    zero_leads = result.scalars().all()

    for campaign in zero_leads:
        alert = await _create_alert_if_not_exists(
            db,
            alert_type="zero_leads_budget",
            severity=AlertSeverity.CRITICAL,
            entity_type="campaign",
            entity_id=campaign.id,
            entity_name=campaign.name,
            message=f"Campaña '{campaign.name}' tiene {campaign.budget_total:.0f}€ de budget pero 0 leads goal",
            threshold_value=0,
            actual_value=campaign.budget_total,
        )
        if alert:
            alerts_created.append("zero_leads_budget")

    # 5. Assets con baja conversión (>1000 visitas, <1% conversion)
    result = await db.execute(
        select(MarketingAsset).where(
            MarketingAsset.visits > 1000,
        )
    )
    assets = result.scalars().all()

    for asset in assets:
        conv_rate = (asset.conversions / max(asset.visits, 1)) * 100
        if conv_rate < 1.0:
            alert = await _create_alert_if_not_exists(
                db,
                alert_type="low_conversion",
                severity=AlertSeverity.WARNING,
                entity_type="asset",
                entity_id=asset.id,
                entity_name=asset.name,
                message=f"Asset '{asset.name}' tiene {asset.visits} visitas pero solo {conv_rate:.2f}% conversión",
                threshold_value=1.0,
                actual_value=conv_rate,
            )
            if alert:
                alerts_created.append("low_conversion")

    # 6. Assets con CTR bajo (>5000 impressions, <0.5% CTR)
    for asset in assets:
        if asset.impressions and asset.impressions > 5000:
            ctr = (asset.clicks / max(asset.impressions, 1)) * 100
            if ctr < 0.5:
                alert = await _create_alert_if_not_exists(
                    db,
                    alert_type="low_ctr",
                    severity=AlertSeverity.INFO,
                    entity_type="asset",
                    entity_id=asset.id,
                    entity_name=asset.name,
                    message=f"Asset '{asset.name}' tiene CTR de {ctr:.2f}% ({asset.impressions} impresiones)",
                    threshold_value=0.5,
                    actual_value=ctr,
                )
                if alert:
                    alerts_created.append("low_ctr")

    await db.commit()

    summary = {}
    for t in alerts_created:
        summary[t] = summary.get(t, 0) + 1

    logger.info(f"Alert engine: {len(alerts_created)} alerts created - {summary}")
    return {
        "alerts_created": len(alerts_created),
        "by_type": summary,
    }


async def _create_alert_if_not_exists(
    db: AsyncSession,
    alert_type: str,
    severity: AlertSeverity,
    entity_type: str,
    entity_id=None,
    entity_name=None,
    message=None,
    threshold_value=None,
    actual_value=None,
    geo_context=None,
) -> MarketingAlert | None:
    """Crea alerta solo si no existe una igual sin resolver."""
    query = select(MarketingAlert).where(
        MarketingAlert.alert_type == alert_type,
        MarketingAlert.entity_type == entity_type,
        MarketingAlert.resolved_at.is_(None),
    )
    if entity_id:
        query = query.where(MarketingAlert.entity_id == entity_id)

    result = await db.execute(query)
    existing = result.scalar_one_or_none()

    if existing:
        return None

    alert = MarketingAlert(
        alert_type=alert_type,
        severity=severity,
        entity_type=entity_type,
        entity_id=entity_id,
        entity_name=entity_name,
        message=message,
        threshold_value=threshold_value,
        actual_value=actual_value,
        geo_context=geo_context,
    )
    db.add(alert)
    await db.flush()
    return alert
