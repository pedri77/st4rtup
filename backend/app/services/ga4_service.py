"""Google Analytics 4 Data API service — consulta métricas de tráfico web."""
import logging
from datetime import date, timedelta

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.system import SystemSettings

logger = logging.getLogger(__name__)

API_BASE = "https://analyticsdata.googleapis.com/v1beta"


async def _get_ga4_config(db: AsyncSession) -> dict | None:
    """Obtiene la config de GA4 con tokens OAuth."""
    result = await db.execute(select(SystemSettings).limit(1))
    settings = result.scalar_one_or_none()
    if not settings or not settings.ga4_config:
        return None
    cfg = settings.ga4_config
    if not cfg.get("connected") or not cfg.get("access_token"):
        return None
    return cfg


async def _refresh_token_if_needed(db: AsyncSession, cfg: dict) -> str | None:
    """Refresca el access_token si hay refresh_token disponible."""
    from app.core.config import settings as app_settings

    refresh_token = cfg.get("refresh_token")
    if not refresh_token:
        return cfg.get("access_token")

    client_id = cfg.get("client_id") or app_settings.GOOGLE_OAUTH_CLIENT_ID
    client_secret = cfg.get("client_secret") or app_settings.GOOGLE_OAUTH_CLIENT_SECRET

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": client_id,
                "client_secret": client_secret,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            },
        )
    if resp.status_code != 200:
        logger.warning("GA4 token refresh failed: %s", resp.text[:200])
        return cfg.get("access_token")

    new_token = resp.json().get("access_token")
    if new_token:
        # Update in DB
        result = await db.execute(select(SystemSettings).limit(1))
        settings = result.scalar_one_or_none()
        if settings:
            updated = {**settings.ga4_config, "access_token": new_token}
            settings.ga4_config = updated
            await db.commit()
    return new_token


async def get_traffic_overview(
    db: AsyncSession,
    start_date: date | None = None,
    end_date: date | None = None,
) -> dict:
    """Obtiene métricas de tráfico: sessions, users, pageviews, bounce rate."""
    cfg = await _get_ga4_config(db)
    if not cfg:
        return {"error": "GA4 no conectado", "connected": False}

    property_id = cfg.get("property_id") or cfg.get("measurement_id", "")
    if not property_id:
        return {"error": "Property ID no configurado", "connected": True}

    access_token = await _refresh_token_if_needed(db, cfg)
    if not access_token:
        return {"error": "Token expirado", "connected": True}

    if not start_date:
        start_date = date.today() - timedelta(days=30)
    if not end_date:
        end_date = date.today()

    # Clean property_id (remove 'G-' prefix if measurement_id)
    prop = property_id.replace("G-", "") if property_id.startswith("G-") else property_id

    body = {
        "dateRanges": [{"startDate": start_date.isoformat(), "endDate": end_date.isoformat()}],
        "metrics": [
            {"name": "sessions"},
            {"name": "totalUsers"},
            {"name": "screenPageViews"},
            {"name": "bounceRate"},
            {"name": "averageSessionDuration"},
            {"name": "conversions"},
        ],
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{API_BASE}/properties/{prop}:runReport",
            json=body,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=15,
        )

    if resp.status_code != 200:
        logger.warning("GA4 API error %d: %s", resp.status_code, resp.text[:200])
        return {"error": f"GA4 API error: {resp.status_code}", "connected": True}

    data = resp.json()
    rows = data.get("rows", [])
    if not rows:
        return {"connected": True, "sessions": 0, "users": 0, "pageviews": 0,
                "bounce_rate": 0, "avg_session_duration": 0, "conversions": 0}

    values = rows[0].get("metricValues", [])
    return {
        "connected": True,
        "sessions": int(values[0]["value"]) if len(values) > 0 else 0,
        "users": int(values[1]["value"]) if len(values) > 1 else 0,
        "pageviews": int(values[2]["value"]) if len(values) > 2 else 0,
        "bounce_rate": round(float(values[3]["value"]) * 100, 1) if len(values) > 3 else 0,
        "avg_session_duration": round(float(values[4]["value"]), 1) if len(values) > 4 else 0,
        "conversions": int(values[5]["value"]) if len(values) > 5 else 0,
        "period": {"start": start_date.isoformat(), "end": end_date.isoformat()},
    }


async def get_traffic_by_source(
    db: AsyncSession,
    start_date: date | None = None,
    end_date: date | None = None,
) -> dict:
    """Obtiene tráfico desglosado por fuente/medio."""
    cfg = await _get_ga4_config(db)
    if not cfg:
        return {"error": "GA4 no conectado", "connected": False}

    property_id = cfg.get("property_id") or cfg.get("measurement_id", "")
    if not property_id:
        return {"error": "Property ID no configurado", "connected": True}

    access_token = await _refresh_token_if_needed(db, cfg)
    if not access_token:
        return {"error": "Token expirado", "connected": True}

    if not start_date:
        start_date = date.today() - timedelta(days=30)
    if not end_date:
        end_date = date.today()

    prop = property_id.replace("G-", "") if property_id.startswith("G-") else property_id

    body = {
        "dateRanges": [{"startDate": start_date.isoformat(), "endDate": end_date.isoformat()}],
        "dimensions": [{"name": "sessionSourceMedium"}],
        "metrics": [
            {"name": "sessions"},
            {"name": "totalUsers"},
            {"name": "conversions"},
        ],
        "orderBys": [{"metric": {"metricName": "sessions"}, "desc": True}],
        "limit": 20,
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{API_BASE}/properties/{prop}:runReport",
            json=body,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=15,
        )

    if resp.status_code != 200:
        return {"error": f"GA4 API error: {resp.status_code}", "connected": True}

    data = resp.json()
    sources = []
    for row in data.get("rows", []):
        dims = row.get("dimensionValues", [])
        vals = row.get("metricValues", [])
        sources.append({
            "source_medium": dims[0]["value"] if dims else "unknown",
            "sessions": int(vals[0]["value"]) if len(vals) > 0 else 0,
            "users": int(vals[1]["value"]) if len(vals) > 1 else 0,
            "conversions": int(vals[2]["value"]) if len(vals) > 2 else 0,
        })

    return {"connected": True, "sources": sources}


async def get_traffic_by_country(
    db: AsyncSession,
    start_date: date | None = None,
    end_date: date | None = None,
) -> dict:
    """Obtiene tráfico desglosado por país (geo-marketing)."""
    cfg = await _get_ga4_config(db)
    if not cfg:
        return {"error": "GA4 no conectado", "connected": False}

    property_id = cfg.get("property_id") or cfg.get("measurement_id", "")
    if not property_id:
        return {"error": "Property ID no configurado", "connected": True}

    access_token = await _refresh_token_if_needed(db, cfg)
    if not access_token:
        return {"error": "Token expirado", "connected": True}

    if not start_date:
        start_date = date.today() - timedelta(days=30)
    if not end_date:
        end_date = date.today()

    prop = property_id.replace("G-", "") if property_id.startswith("G-") else property_id

    body = {
        "dateRanges": [{"startDate": start_date.isoformat(), "endDate": end_date.isoformat()}],
        "dimensions": [{"name": "country"}],
        "metrics": [
            {"name": "sessions"},
            {"name": "totalUsers"},
            {"name": "conversions"},
        ],
        "orderBys": [{"metric": {"metricName": "sessions"}, "desc": True}],
        "limit": 20,
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{API_BASE}/properties/{prop}:runReport",
            json=body,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=15,
        )

    if resp.status_code != 200:
        return {"error": f"GA4 API error: {resp.status_code}", "connected": True}

    data = resp.json()
    countries = []
    for row in data.get("rows", []):
        dims = row.get("dimensionValues", [])
        vals = row.get("metricValues", [])
        countries.append({
            "country": dims[0]["value"] if dims else "unknown",
            "sessions": int(vals[0]["value"]) if len(vals) > 0 else 0,
            "users": int(vals[1]["value"]) if len(vals) > 1 else 0,
            "conversions": int(vals[2]["value"]) if len(vals) > 2 else 0,
        })

    return {"connected": True, "countries": countries}
