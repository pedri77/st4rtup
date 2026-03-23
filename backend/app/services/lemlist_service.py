"""Lemlist API service — cold email outreach y sales automation.

API Docs: https://developer.lemlist.com/api-reference
Auth: API Key via header
"""
import logging
from base64 import b64encode

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.system import SystemSettings

logger = logging.getLogger(__name__)

API_BASE = "https://api.lemlist.com/api"


async def _get_lemlist_config(db: AsyncSession) -> dict | None:
    result = await db.execute(select(SystemSettings).limit(1))
    settings = result.scalar_one_or_none()
    if not settings:
        return None
    cfg = settings.general_config or {}
    lemlist_cfg = cfg.get("lemlist", {})
    if not lemlist_cfg.get("api_key"):
        return None
    return lemlist_cfg


def _auth_header(api_key: str) -> dict:
    """Lemlist usa Basic Auth con api_key como password, user vacío."""
    encoded = b64encode(f":{api_key}".encode()).decode()
    return {"Authorization": f"Basic {encoded}"}


async def list_campaigns(db: AsyncSession) -> dict:
    """Lista todas las campañas de Lemlist."""
    cfg = await _get_lemlist_config(db)
    if not cfg:
        return {"error": "Lemlist no configurado", "connected": False}

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{API_BASE}/campaigns",
            headers=_auth_header(cfg["api_key"]),
            timeout=15,
        )

    if resp.status_code != 200:
        return {"error": f"Lemlist API error: {resp.status_code}", "connected": True}

    campaigns = resp.json()
    return {
        "connected": True,
        "campaigns": [
            {
                "id": c.get("_id"),
                "name": c.get("name"),
                "status": "active" if not c.get("archived") else "archived",
                "leads_count": c.get("leadsCount", 0),
                "sent_count": c.get("sentCount", 0),
                "opened_count": c.get("openedCount", 0),
                "clicked_count": c.get("clickedCount", 0),
                "replied_count": c.get("repliedCount", 0),
                "bounced_count": c.get("bouncedCount", 0),
            }
            for c in campaigns
        ],
    }


async def get_campaign_stats(db: AsyncSession, campaign_id: str) -> dict:
    """Obtiene estadísticas detalladas de una campaña."""
    cfg = await _get_lemlist_config(db)
    if not cfg:
        return {"error": "Lemlist no configurado", "connected": False}

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{API_BASE}/campaigns/{campaign_id}",
            headers=_auth_header(cfg["api_key"]),
            timeout=15,
        )

    if resp.status_code != 200:
        return {"error": f"Lemlist API error: {resp.status_code}", "connected": True}

    return {"connected": True, "campaign": resp.json()}


async def add_lead_to_campaign(
    db: AsyncSession,
    campaign_id: str,
    email: str,
    first_name: str = "",
    last_name: str = "",
    company_name: str = "",
    custom_fields: dict | None = None,
) -> dict:
    """Añade un lead a una campaña de Lemlist."""
    cfg = await _get_lemlist_config(db)
    if not cfg:
        return {"error": "Lemlist no configurado", "connected": False}

    body = {
        "email": email,
        "firstName": first_name,
        "lastName": last_name,
        "companyName": company_name,
    }
    if custom_fields:
        body.update(custom_fields)

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{API_BASE}/campaigns/{campaign_id}/leads/{email}",
            json=body,
            headers=_auth_header(cfg["api_key"]),
            timeout=15,
        )

    if resp.status_code == 200:
        return {"connected": True, "added": True, "lead": resp.json()}
    elif resp.status_code == 409:
        return {"connected": True, "added": False, "reason": "Lead already in campaign"}
    else:
        return {"error": f"Lemlist API error: {resp.status_code}", "connected": True}


async def remove_lead_from_campaign(db: AsyncSession, campaign_id: str, email: str) -> dict:
    """Elimina un lead de una campaña."""
    cfg = await _get_lemlist_config(db)
    if not cfg:
        return {"error": "Lemlist no configurado", "connected": False}

    async with httpx.AsyncClient() as client:
        resp = await client.delete(
            f"{API_BASE}/campaigns/{campaign_id}/leads/{email}",
            headers=_auth_header(cfg["api_key"]),
            timeout=15,
        )

    return {"connected": True, "removed": resp.status_code == 200}


async def sync_lead_activity(db: AsyncSession, campaign_id: str, email: str) -> dict:
    """Obtiene la actividad de un lead en una campaña (opens, clicks, replies)."""
    cfg = await _get_lemlist_config(db)
    if not cfg:
        return {"error": "Lemlist no configurado", "connected": False}

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{API_BASE}/campaigns/{campaign_id}/leads/{email}",
            headers=_auth_header(cfg["api_key"]),
            timeout=15,
        )

    if resp.status_code != 200:
        return {"error": f"Lemlist API error: {resp.status_code}", "connected": True}

    lead_data = resp.json()
    return {
        "connected": True,
        "email": email,
        "status": lead_data.get("leadStatus"),
        "opened": lead_data.get("openedCount", 0) > 0,
        "clicked": lead_data.get("clickedCount", 0) > 0,
        "replied": lead_data.get("repliedCount", 0) > 0,
        "bounced": lead_data.get("bouncedCount", 0) > 0,
        "open_count": lead_data.get("openedCount", 0),
        "click_count": lead_data.get("clickedCount", 0),
    }


async def get_team_stats(db: AsyncSession) -> dict:
    """Obtiene estadísticas globales del equipo en Lemlist."""
    cfg = await _get_lemlist_config(db)
    if not cfg:
        return {"error": "Lemlist no configurado", "connected": False}

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{API_BASE}/team",
            headers=_auth_header(cfg["api_key"]),
            timeout=15,
        )

    if resp.status_code != 200:
        return {"error": f"Lemlist API error: {resp.status_code}", "connected": True}

    return {"connected": True, "team": resp.json()}
