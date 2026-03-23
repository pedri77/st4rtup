"""
Waalaxy LinkedIn outreach service.
Integra con la API de Waalaxy para automatizar conexiones y mensajes en LinkedIn.
API docs: https://developers.waalaxy.com
"""
import httpx
import logging
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.models import SystemSettings
from app.core.config import settings as app_settings

logger = logging.getLogger(__name__)
TIMEOUT = 15.0
WAALAXY_API = "https://api.waalaxy.com/api/v2"


async def _get_api_key(db: Optional[AsyncSession] = None) -> str:
    """Obtiene API key de Waalaxy."""
    if db:
        result = await db.execute(select(SystemSettings).limit(1))
        sys_settings = result.scalar_one_or_none()
        if sys_settings and sys_settings.linkedin_config:
            key = sys_settings.linkedin_config.get("waalaxy_api_key", "")
            if key:
                return key
    key = getattr(app_settings, "WAALAXY_API_KEY", "")
    if key:
        return key
    raise ValueError("Waalaxy no configurado: falta api_key")


async def list_campaigns(db: Optional[AsyncSession] = None) -> list:
    """Lista campanas de outreach activas."""
    api_key = await _get_api_key(db)
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.get(
            f"{WAALAXY_API}/campaigns",
            headers={"Authorization": f"Bearer {api_key}"},
        )
        if r.status_code == 200:
            return r.json().get("data", [])
        raise ValueError(f"Waalaxy error: {r.status_code}")


async def get_campaign_stats(campaign_id: str, db: Optional[AsyncSession] = None) -> dict:
    """Obtiene estadisticas de una campana."""
    api_key = await _get_api_key(db)
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.get(
            f"{WAALAXY_API}/campaigns/{campaign_id}/stats",
            headers={"Authorization": f"Bearer {api_key}"},
        )
        if r.status_code == 200:
            return r.json()
        raise ValueError(f"Waalaxy error: {r.status_code}")


async def add_prospect_to_campaign(
    campaign_id: str,
    linkedin_url: str,
    first_name: str = "",
    last_name: str = "",
    company: str = "",
    db: Optional[AsyncSession] = None,
) -> dict:
    """Anade un prospecto a una campana de Waalaxy."""
    api_key = await _get_api_key(db)
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.post(
            f"{WAALAXY_API}/campaigns/{campaign_id}/prospects",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "linkedin_url": linkedin_url,
                "first_name": first_name,
                "last_name": last_name,
                "company": company,
            },
        )
        if r.status_code in (200, 201):
            return r.json()
        raise ValueError(f"Waalaxy error: {r.status_code} {r.text[:200]}")


async def list_prospects(campaign_id: str = None, db: Optional[AsyncSession] = None) -> list:
    """Lista prospectos (opcionalmente filtrados por campana)."""
    api_key = await _get_api_key(db)
    url = f"{WAALAXY_API}/prospects"
    params = {}
    if campaign_id:
        params["campaign_id"] = campaign_id

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.get(url, headers={"Authorization": f"Bearer {api_key}"}, params=params)
        if r.status_code == 200:
            return r.json().get("data", [])
        raise ValueError(f"Waalaxy error: {r.status_code}")


async def sync_lead_to_waalaxy(
    db: AsyncSession,
    lead_id: str,
    campaign_id: str,
) -> dict:
    """Sincroniza un lead del CRM a una campana de Waalaxy."""
    from app.models import Lead
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        raise ValueError("Lead not found")

    linkedin_url = ""
    if lead.metadata_ and isinstance(lead.metadata_, dict):
        linkedin_url = lead.metadata_.get("linkedin_url", "")

    if not linkedin_url:
        raise ValueError("Lead no tiene perfil de LinkedIn")

    return await add_prospect_to_campaign(
        campaign_id=campaign_id,
        linkedin_url=linkedin_url,
        first_name=lead.contact_name.split()[0] if lead.contact_name else "",
        last_name=" ".join(lead.contact_name.split()[1:]) if lead.contact_name and " " in lead.contact_name else "",
        company=lead.company_name or "",
        db=db,
    )
