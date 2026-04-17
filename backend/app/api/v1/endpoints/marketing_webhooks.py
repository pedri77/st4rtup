"""Webhooks de marketing para n8n — 6 endpoints + monitorización."""
import logging
import time
from typing import Optional
from datetime import datetime, timezone, date as date_type
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.core.database import get_db
from app.core.tenant import get_org_id
from app.core.security import get_current_user
from app.models.marketing_webhook import MarketingWebhookLog, LeadAttribution, MarketingMetricsCache
from app.models.marketing import MarketingAsset, MarketingCalendarEvent, MarketingAlert, Campaign
from app.models.lead import Lead
from app.models.enums import MarketingAssetType, MarketingAssetStatus, AlertSeverity, CalendarEventType
from app.schemas.marketing_webhook import (
    CampaignMetricsPayload, SocialEngagementPayload, ContentPublishedPayload,
    LeadAttributionPayload, ExternalAlertPayload, MetricsSyncPayload,
    WebhookResponse, MarketingWebhookLogResponse,
)
from app.schemas.base import PaginatedResponse

logger = logging.getLogger(__name__)

router = APIRouter()


# ─── Helpers ──────────────────────────────────────────────────────

async def _check_idempotency(db: AsyncSession, event_id: str) -> bool:
    """Retorna True si el event_id ya fue procesado."""
    result = await db.execute(
        select(MarketingWebhookLog).where(MarketingWebhookLog.event_id == event_id)
    )
    return result.scalar_one_or_none() is not None


async def _log_webhook(
    db: AsyncSession,
    event_id: str,
    webhook_type: str,
    source: str,
    payload: dict,
    result: dict,
    entities_affected: int,
    success: bool,
    error: str | None,
    processing_ms: int,
    ip_address: str | None,
):
    """Registra el webhook en el log."""
    log = MarketingWebhookLog(
        event_id=event_id,
        webhook_type=webhook_type,
        source=source,
        payload=payload,
        result=result,
        entities_affected=entities_affected,
        success=success,
        error=error,
        processing_ms=processing_ms,
        ip_address=ip_address,
    )
    db.add(log)
    await db.commit()


# ─── 1. Campaign Metrics ─────────────────────────────────────────

@router.post("/campaign-metrics", response_model=WebhookResponse)
async def receive_campaign_metrics(
    data: CampaignMetricsPayload,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
org_id: str = Depends(get_org_id),
):
    """Recibe métricas de campañas desde n8n (Google Ads, LinkedIn Ads, etc.)."""
    start = time.monotonic()

    if await _check_idempotency(db, data.event_id):
        return WebhookResponse(status="already_processed", event_id=data.event_id)

    updated = 0
    for metric in data.metrics:
        # Buscar campaña por nombre
        result = await db.execute(
            select(Campaign).where(Campaign.name.ilike(f"%{metric.campaign_name}%"))
        )
        campaign = result.scalar_one_or_none()
        if campaign:
            campaign.actual_budget = (campaign.actual_budget or 0) + metric.cost
            if not campaign.metrics:
                campaign.metrics = {}
            campaign.metrics[data.source] = {
                "impressions": metric.impressions,
                "clicks": metric.clicks,
                "cost": metric.cost,
                "conversions": metric.conversions,
                "date": data.date,
            }
            updated += 1
        else:
            logger.warning(f"Campaign not found: {metric.campaign_name}")

    await db.commit()
    ms = int((time.monotonic() - start) * 1000)

    await _log_webhook(
        db, data.event_id, "campaign_metrics", data.source,
        data.model_dump(), {"updated_campaigns": updated},
        updated, True, None, ms,
        request.client.host if request.client else None,
    )

    return WebhookResponse(status="ok", event_id=data.event_id, entities_affected=updated)


# ─── 2. Social Engagement ────────────────────────────────────────

@router.post("/social-engagement", response_model=WebhookResponse)
async def receive_social_engagement(
    data: SocialEngagementPayload,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
org_id: str = Depends(get_org_id),
):
    """Recibe datos de engagement de redes sociales desde n8n."""
    start = time.monotonic()

    if await _check_idempotency(db, data.event_id):
        return WebhookResponse(status="already_processed", event_id=data.event_id)

    updated = 0
    for post in data.posts:
        # Buscar asset existente por post_id o título
        query = select(MarketingAsset)
        if post.post_id:
            query = query.where(MarketingAsset.external_url == post.url)
        elif post.title:
            query = query.where(MarketingAsset.name.ilike(f"%{post.title}%"))
        else:
            continue

        result = await db.execute(query)
        asset = result.scalar_one_or_none()

        if asset:
            asset.visits = (asset.visits or 0) + post.impressions
            asset.clicks = (asset.clicks or 0) + post.clicks
            updated += 1

    await db.commit()
    ms = int((time.monotonic() - start) * 1000)

    await _log_webhook(
        db, data.event_id, "social_engagement", data.source,
        data.model_dump(), {"updated_assets": updated},
        updated, True, None, ms,
        request.client.host if request.client else None,
    )

    return WebhookResponse(status="ok", event_id=data.event_id, entities_affected=updated)


# ─── 3. Content Published ────────────────────────────────────────

@router.post("/content-published", response_model=WebhookResponse)
async def receive_content_published(
    data: ContentPublishedPayload,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
org_id: str = Depends(get_org_id),
):
    """Recibe notificación de contenido publicado desde n8n."""
    start = time.monotonic()

    if await _check_idempotency(db, data.event_id):
        return WebhookResponse(status="already_processed", event_id=data.event_id)

    content = data.content
    content_type = content.get("type", "blog_post")

    # Mapear tipo de contenido
    asset_type_map = {
        "blog_post": MarketingAssetType.BLOG_POST,
        "video": MarketingAssetType.VIDEO,
        "landing_page": MarketingAssetType.LANDING_PAGE,
        "whitepaper": MarketingAssetType.WHITEPAPER,
        "case_study": MarketingAssetType.CASE_STUDY,
    }
    asset_type = asset_type_map.get(content_type, MarketingAssetType.BLOG_POST)

    # Crear asset
    asset = MarketingAsset(
        name=content.get("title", "Untitled"),
        type=asset_type,
        status=MarketingAssetStatus.PUBLISHED,
        external_url=content.get("url"),
        language=content.get("language", "es"),
        seo_title=content.get("meta_title"),
        seo_description=content.get("meta_description"),
        target_keywords=content.get("target_keywords", []),
    )
    db.add(asset)

    # Crear evento en calendario
    published_at = content.get("published_at")
    if published_at:
        try:
            pub_date = datetime.fromisoformat(published_at.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            pub_date = datetime.now(timezone.utc)
    else:
        pub_date = datetime.now(timezone.utc)

    cal_event = MarketingCalendarEvent(
        title=f"Publicado: {content.get('title', 'Contenido')}",
        event_type=CalendarEventType.CONTENT_PUBLISH,
        start_date=pub_date.date(),
        description=content.get("url", ""),
    )
    db.add(cal_event)

    await db.commit()
    ms = int((time.monotonic() - start) * 1000)

    await _log_webhook(
        db, data.event_id, "content_published", data.source,
        data.model_dump(), {"asset_created": True},
        2, True, None, ms,
        request.client.host if request.client else None,
    )

    return WebhookResponse(status="ok", event_id=data.event_id, entities_affected=2)


# ─── 4. Lead Attribution ─────────────────────────────────────────

@router.post("/lead-attribution", response_model=WebhookResponse)
async def receive_lead_attribution(
    data: LeadAttributionPayload,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
org_id: str = Depends(get_org_id),
):
    """Recibe datos de atribución de leads desde n8n."""
    start = time.monotonic()

    if await _check_idempotency(db, data.event_id):
        return WebhookResponse(status="already_processed", event_id=data.event_id)

    # Verificar que el lead existe
    lead_result = await db.execute(
        select(Lead).where(Lead.id == UUID(data.lead_id))
    )
    lead = lead_result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail=f"Lead {data.lead_id} not found")

    created = 0
    for i, tp in enumerate(data.touchpoints):
        # Buscar campaña si se proporcionó campaign_id
        campaign_uuid = None
        if tp.campaign_id:
            try:
                campaign_uuid = UUID(tp.campaign_id)
            except ValueError:
                pass

        touchpoint_at = None
        if tp.timestamp:
            try:
                touchpoint_at = datetime.fromisoformat(tp.timestamp.replace("Z", "+00:00"))
            except (ValueError, AttributeError):
                pass

        attribution = LeadAttribution(
            lead_id=UUID(data.lead_id),
            channel=tp.channel,
            campaign_id=campaign_uuid,
            utm_source=tp.utm_source,
            utm_medium=tp.utm_medium,
            utm_campaign=tp.utm_campaign,
            landing_page=tp.landing_page,
            country=tp.country,
            region=tp.region,
            touchpoint_at=touchpoint_at,
            attribution_model=data.attribution_model,
            is_converting=(i == len(data.touchpoints) - 1),  # Last touch = converting
        )
        db.add(attribution)
        created += 1

    await db.commit()
    ms = int((time.monotonic() - start) * 1000)

    await _log_webhook(
        db, data.event_id, "lead_attribution", "n8n",
        data.model_dump(), {"touchpoints_created": created},
        created, True, None, ms,
        request.client.host if request.client else None,
    )

    return WebhookResponse(status="ok", event_id=data.event_id, entities_affected=created)


# ─── 5. External Alert ───────────────────────────────────────────

@router.post("/external-alert", response_model=WebhookResponse)
async def receive_external_alert(
    data: ExternalAlertPayload,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
org_id: str = Depends(get_org_id),
):
    """Recibe alertas externas de marketing desde n8n."""
    start = time.monotonic()

    if await _check_idempotency(db, data.event_id):
        return WebhookResponse(status="already_processed", event_id=data.event_id)

    alert_data = data.alert
    severity_map = {
        "info": AlertSeverity.INFO,
        "warning": AlertSeverity.WARNING,
        "critical": AlertSeverity.CRITICAL,
    }
    severity = severity_map.get(alert_data.get("severity", "info"), AlertSeverity.INFO)

    alert = MarketingAlert(
        alert_type=alert_data.get("type", "external"),
        severity=severity,
        title=alert_data.get("title", "External Alert"),
        message=alert_data.get("description", "External alert from n8n"),
        source=alert_data.get("source", "n8n"),
        data=alert_data.get("data"),
        recommended_action=alert_data.get("recommended_action"),
    )
    db.add(alert)
    await db.commit()

    # Telegram notification for critical alerts
    if severity == AlertSeverity.CRITICAL:
        try:
            from app.services.telegram_service import send_message
            await send_message(f"🚨 *Alerta Marketing CRITICAL*\n{alert_data.get('title', '')}\n{alert_data.get('description', '')}")
        except Exception as e:
            logger.warning(f"Failed to send Telegram alert: {e}")

    ms = int((time.monotonic() - start) * 1000)

    await _log_webhook(
        db, data.event_id, "external_alert", alert_data.get("source", "n8n"),
        data.model_dump(), {"alert_id": str(alert.id)},
        1, True, None, ms,
        request.client.host if request.client else None,
    )

    return WebhookResponse(status="ok", event_id=data.event_id, entities_affected=1)


# ─── 6. Metrics Sync ─────────────────────────────────────────────

@router.post("/metrics-sync", response_model=WebhookResponse)
async def receive_metrics_sync(
    data: MetricsSyncPayload,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
org_id: str = Depends(get_org_id),
):
    """Recibe métricas consolidadas de marketing desde n8n (GA4, Search Console, etc.)."""
    start = time.monotonic()

    if await _check_idempotency(db, data.event_id):
        return WebhookResponse(status="already_processed", event_id=data.event_id)

    try:
        metrics_date = date_type.fromisoformat(data.date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format, expected YYYY-MM-DD")

    # Upsert metrics cache
    existing = await db.execute(
        select(MarketingMetricsCache).where(
            MarketingMetricsCache.date == metrics_date,
            MarketingMetricsCache.source == data.source,
        )
    )
    cache = existing.scalar_one_or_none()

    if cache:
        cache.metrics = data.metrics
    else:
        cache = MarketingMetricsCache(
            date=metrics_date,
            source=data.source,
            metrics=data.metrics,
        )
        db.add(cache)

    await db.commit()
    ms = int((time.monotonic() - start) * 1000)

    await _log_webhook(
        db, data.event_id, "metrics_sync", data.source,
        data.model_dump(), {"date": data.date, "upserted": True},
        1, True, None, ms,
        request.client.host if request.client else None,
    )

    return WebhookResponse(status="ok", event_id=data.event_id, entities_affected=1)


# ─── Monitoring endpoints ────────────────────────────────────────

@router.get("/logs", response_model=PaginatedResponse)
async def list_webhook_logs(
    webhook_type: Optional[str] = None,
    source: Optional[str] = None,
    success: Optional[bool] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
org_id: str = Depends(get_org_id),
):
    """Lista logs de webhooks de marketing."""
    query = select(MarketingWebhookLog).where(MarketingWebhookLog.org_id == org_id).order_by(desc(MarketingWebhookLog.created_at))

    if webhook_type:
        query = query.where(MarketingWebhookLog.webhook_type == webhook_type)
    if source:
        query = query.where(MarketingWebhookLog.source == source)
    if success is not None:
        query = query.where(MarketingWebhookLog.success.is_(success))

    count_q = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_q) or 0
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)

    return PaginatedResponse(
        items=[MarketingWebhookLogResponse.model_validate(log) for log in result.scalars().all()],
        total=total, page=page, page_size=page_size,
        pages=max(1, (total + page_size - 1) // page_size),
    )


@router.get("/stats")
async def webhook_stats(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
org_id: str = Depends(get_org_id),
):
    """Estadísticas de webhooks de marketing."""
    total = await db.scalar(select(func.count()).select_from(MarketingWebhookLog)) or 0
    errors = await db.scalar(
        select(func.count()).select_from(MarketingWebhookLog).where(MarketingWebhookLog.success.is_(False))
    ) or 0

    by_type = await db.execute(
        select(MarketingWebhookLog.webhook_type, func.count(MarketingWebhookLog.id))
        .group_by(MarketingWebhookLog.webhook_type)
    )

    return {
        "total": total,
        "errors": errors,
        "success_rate": round((total - errors) / total * 100, 1) if total > 0 else 100,
        "by_type": {row[0]: row[1] for row in by_type.all()},
    }


@router.get("/health")
async def webhook_health(
    db: AsyncSession = Depends(get_db),
):
    """Health check para n8n — verifica que los endpoints están activos."""
    try:
        await db.execute(select(func.count()).select_from(MarketingWebhookLog))
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        return {"status": "error", "database": str(e)}
