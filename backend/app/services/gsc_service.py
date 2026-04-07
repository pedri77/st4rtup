"""Google Search Console API service — keywords, CTR, posiciones."""
import logging
from datetime import date, timedelta

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.system import SystemSettings

logger = logging.getLogger(__name__)

API_BASE = "https://www.googleapis.com/webmasters/v3"


async def _get_gsc_config(db: AsyncSession) -> dict | None:
    result = await db.execute(select(SystemSettings).limit(1))
    settings = result.scalar_one_or_none()
    if not settings or not settings.gsc_config:
        return None
    from app.core.credential_store import credential_store, SENSITIVE_KEYS
    cfg = credential_store.decrypt_config(
        settings.gsc_config, SENSITIVE_KEYS.get("gsc_config", [])
    )
    if not cfg.get("connected") or not cfg.get("access_token"):
        return None
    return cfg


async def _refresh_token_if_needed(db: AsyncSession, cfg: dict) -> str | None:
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
        logger.warning("GSC token refresh failed: %s", resp.text[:200])
        return cfg.get("access_token")

    new_token = resp.json().get("access_token")
    if new_token:
        from app.core.credential_store import credential_store, SENSITIVE_KEYS
        result = await db.execute(select(SystemSettings).limit(1))
        settings = result.scalar_one_or_none()
        if settings:
            # Decifrar lo existente, actualizar, re-cifrar
            existing = credential_store.decrypt_config(
                settings.gsc_config or {}, SENSITIVE_KEYS.get("gsc_config", [])
            )
            updated = {**existing, "access_token": new_token}
            settings.gsc_config = credential_store.encrypt_config(
                updated, SENSITIVE_KEYS.get("gsc_config", [])
            )
            await db.commit()
    return new_token


async def get_search_performance(
    db: AsyncSession,
    start_date: date | None = None,
    end_date: date | None = None,
) -> dict:
    """Obtiene métricas globales de GSC: clicks, impressions, CTR, position."""
    cfg = await _get_gsc_config(db)
    if not cfg:
        return {"error": "GSC no conectado", "connected": False}

    site_url = cfg.get("site_url", "")
    if not site_url:
        return {"error": "Site URL no configurado", "connected": True}

    access_token = await _refresh_token_if_needed(db, cfg)
    if not access_token:
        return {"error": "Token expirado", "connected": True}

    if not start_date:
        start_date = date.today() - timedelta(days=28)
    if not end_date:
        end_date = date.today() - timedelta(days=3)  # GSC data has 3-day delay

    body = {
        "startDate": start_date.isoformat(),
        "endDate": end_date.isoformat(),
        "dimensions": ["date"],
        "rowLimit": 100,
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{API_BASE}/sites/{site_url}/searchAnalytics/query",
            json=body,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=15,
        )

    if resp.status_code != 200:
        logger.warning("GSC API error %d: %s", resp.status_code, resp.text[:200])
        return {"error": f"GSC API error: {resp.status_code}", "connected": True}

    data = resp.json()
    rows = data.get("rows", [])

    total_clicks = sum(r.get("clicks", 0) for r in rows)
    total_impressions = sum(r.get("impressions", 0) for r in rows)
    avg_ctr = (total_clicks / total_impressions * 100) if total_impressions > 0 else 0
    avg_position = sum(r.get("position", 0) for r in rows) / len(rows) if rows else 0

    daily = [
        {
            "date": r["keys"][0],
            "clicks": r.get("clicks", 0),
            "impressions": r.get("impressions", 0),
            "ctr": round(r.get("ctr", 0) * 100, 2),
            "position": round(r.get("position", 0), 1),
        }
        for r in rows
    ]

    return {
        "connected": True,
        "total_clicks": total_clicks,
        "total_impressions": total_impressions,
        "avg_ctr": round(avg_ctr, 2),
        "avg_position": round(avg_position, 1),
        "daily": daily,
        "period": {"start": start_date.isoformat(), "end": end_date.isoformat()},
    }


async def get_top_queries(
    db: AsyncSession,
    start_date: date | None = None,
    end_date: date | None = None,
    country: str | None = None,
    limit: int = 25,
) -> dict:
    """Obtiene las top queries de búsqueda con métricas."""
    cfg = await _get_gsc_config(db)
    if not cfg:
        return {"error": "GSC no conectado", "connected": False}

    site_url = cfg.get("site_url", "")
    if not site_url:
        return {"error": "Site URL no configurado", "connected": True}

    access_token = await _refresh_token_if_needed(db, cfg)
    if not access_token:
        return {"error": "Token expirado", "connected": True}

    if not start_date:
        start_date = date.today() - timedelta(days=28)
    if not end_date:
        end_date = date.today() - timedelta(days=3)

    body = {
        "startDate": start_date.isoformat(),
        "endDate": end_date.isoformat(),
        "dimensions": ["query"],
        "rowLimit": limit,
    }

    if country:
        body["dimensionFilterGroups"] = [{
            "filters": [{"dimension": "country", "expression": country.upper()}]
        }]

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{API_BASE}/sites/{site_url}/searchAnalytics/query",
            json=body,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=15,
        )

    if resp.status_code != 200:
        return {"error": f"GSC API error: {resp.status_code}", "connected": True}

    data = resp.json()
    queries = [
        {
            "query": r["keys"][0],
            "clicks": r.get("clicks", 0),
            "impressions": r.get("impressions", 0),
            "ctr": round(r.get("ctr", 0) * 100, 2),
            "position": round(r.get("position", 0), 1),
        }
        for r in data.get("rows", [])
    ]

    return {"connected": True, "queries": queries}


async def get_top_pages(
    db: AsyncSession,
    start_date: date | None = None,
    end_date: date | None = None,
    limit: int = 25,
) -> dict:
    """Obtiene las top páginas con métricas de búsqueda."""
    cfg = await _get_gsc_config(db)
    if not cfg:
        return {"error": "GSC no conectado", "connected": False}

    site_url = cfg.get("site_url", "")
    if not site_url:
        return {"error": "Site URL no configurado", "connected": True}

    access_token = await _refresh_token_if_needed(db, cfg)
    if not access_token:
        return {"error": "Token expirado", "connected": True}

    if not start_date:
        start_date = date.today() - timedelta(days=28)
    if not end_date:
        end_date = date.today() - timedelta(days=3)

    body = {
        "startDate": start_date.isoformat(),
        "endDate": end_date.isoformat(),
        "dimensions": ["page"],
        "rowLimit": limit,
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{API_BASE}/sites/{site_url}/searchAnalytics/query",
            json=body,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=15,
        )

    if resp.status_code != 200:
        return {"error": f"GSC API error: {resp.status_code}", "connected": True}

    data = resp.json()
    pages = [
        {
            "page": r["keys"][0],
            "clicks": r.get("clicks", 0),
            "impressions": r.get("impressions", 0),
            "ctr": round(r.get("ctr", 0) * 100, 2),
            "position": round(r.get("position", 0), 1),
        }
        for r in data.get("rows", [])
    ]

    return {"connected": True, "pages": pages}


async def get_performance_by_country(
    db: AsyncSession,
    start_date: date | None = None,
    end_date: date | None = None,
) -> dict:
    """Obtiene rendimiento SEO desglosado por país (geo-SEO)."""
    cfg = await _get_gsc_config(db)
    if not cfg:
        return {"error": "GSC no conectado", "connected": False}

    site_url = cfg.get("site_url", "")
    if not site_url:
        return {"error": "Site URL no configurado", "connected": True}

    access_token = await _refresh_token_if_needed(db, cfg)
    if not access_token:
        return {"error": "Token expirado", "connected": True}

    if not start_date:
        start_date = date.today() - timedelta(days=28)
    if not end_date:
        end_date = date.today() - timedelta(days=3)

    body = {
        "startDate": start_date.isoformat(),
        "endDate": end_date.isoformat(),
        "dimensions": ["country"],
        "rowLimit": 50,
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{API_BASE}/sites/{site_url}/searchAnalytics/query",
            json=body,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=15,
        )

    if resp.status_code != 200:
        return {"error": f"GSC API error: {resp.status_code}", "connected": True}

    data = resp.json()
    countries = [
        {
            "country": r["keys"][0],
            "clicks": r.get("clicks", 0),
            "impressions": r.get("impressions", 0),
            "ctr": round(r.get("ctr", 0) * 100, 2),
            "position": round(r.get("position", 0), 1),
        }
        for r in data.get("rows", [])
    ]

    return {"connected": True, "countries": countries}
