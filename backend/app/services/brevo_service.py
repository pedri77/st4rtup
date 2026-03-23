"""Brevo (ex-Sendinblue) API service — nurturing y re-activation de leads fríos.

API Docs: https://developers.brevo.com/reference
Free tier: 300 emails/day
"""
import logging
from datetime import datetime, timezone

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.models.system import SystemSettings

logger = logging.getLogger(__name__)

API_BASE = "https://api.brevo.com/v3"


def _get_api_key() -> str | None:
    """Obtiene Brevo API key desde config o env."""
    return settings.BREVO_API_KEY or None


def _headers(api_key: str) -> dict:
    return {"api-key": api_key, "Content-Type": "application/json"}


# ─── Contacts ─────────────────────────────────────────────────────

async def create_or_update_contact(
    email: str,
    first_name: str = "",
    last_name: str = "",
    company: str = "",
    attributes: dict | None = None,
    list_ids: list[int] | None = None,
) -> dict:
    """Crea o actualiza un contacto en Brevo."""
    api_key = _get_api_key()
    if not api_key:
        return {"error": "Brevo API key not configured"}

    body = {
        "email": email,
        "attributes": {
            "FIRSTNAME": first_name,
            "LASTNAME": last_name,
            "COMPANY": company,
            **(attributes or {}),
        },
        "updateEnabled": True,
    }
    if list_ids:
        body["listIds"] = list_ids

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{API_BASE}/contacts",
            json=body,
            headers=_headers(api_key),
            timeout=10,
        )

    if resp.status_code in (200, 201, 204):
        return {"created": True, "email": email}
    elif resp.status_code == 400 and "already exist" in resp.text.lower():
        return {"created": False, "email": email, "reason": "already_exists"}
    else:
        logger.warning("Brevo create contact error %d: %s", resp.status_code, resp.text[:200])
        return {"error": f"Brevo API error: {resp.status_code}"}


# ─── Lists ────────────────────────────────────────────────────────

async def get_lists() -> dict:
    """Obtiene todas las listas de Brevo."""
    api_key = _get_api_key()
    if not api_key:
        return {"error": "Brevo API key not configured"}

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{API_BASE}/contacts/lists",
            params={"limit": 50},
            headers=_headers(api_key),
            timeout=10,
        )

    if resp.status_code != 200:
        return {"error": f"Brevo API error: {resp.status_code}"}

    data = resp.json()
    return {
        "lists": [
            {"id": lst["id"], "name": lst["name"], "total_subscribers": lst.get("totalSubscribers", 0)}
            for lst in data.get("lists", [])
        ]
    }


async def create_list(name: str, folder_id: int = 1) -> dict:
    """Crea una lista en Brevo."""
    api_key = _get_api_key()
    if not api_key:
        return {"error": "Brevo API key not configured"}

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{API_BASE}/contacts/lists",
            json={"name": name, "folderId": folder_id},
            headers=_headers(api_key),
            timeout=10,
        )

    if resp.status_code in (200, 201):
        return {"created": True, **resp.json()}
    return {"error": f"Brevo API error: {resp.status_code}"}


# ─── Campaigns ────────────────────────────────────────────────────

async def send_transactional_email(
    to_email: str,
    to_name: str,
    subject: str,
    html_content: str,
    sender_name: str = "St4rtup",
    sender_email: str = "info@st4rtup.app",
    tags: list[str] | None = None,
) -> dict:
    """Envía un email transaccional via Brevo."""
    api_key = _get_api_key()
    if not api_key:
        return {"error": "Brevo API key not configured"}

    body = {
        "sender": {"name": sender_name, "email": sender_email},
        "to": [{"email": to_email, "name": to_name}],
        "subject": subject,
        "htmlContent": html_content,
    }
    if tags:
        body["tags"] = tags

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{API_BASE}/smtp/email",
            json=body,
            headers=_headers(api_key),
            timeout=15,
        )

    if resp.status_code in (200, 201):
        return {"sent": True, **resp.json()}
    logger.warning("Brevo send email error %d: %s", resp.status_code, resp.text[:200])
    return {"error": f"Brevo API error: {resp.status_code}"}


# ─── Nurturing Pipeline ──────────────────────────────────────────

async def add_lead_to_nurturing(
    db: AsyncSession,
    email: str,
    first_name: str = "",
    company: str = "",
    source: str = "crm_cold",
    icp_score: int = 0,
) -> dict:
    """Añade un lead frío a la lista de nurturing en Brevo.

    Leads con ICP < 40 van a nurturing automático con emails
    mensuales sobre ENS/NIS2/DORA.
    """
    # Get nurturing list ID from settings
    result = await db.execute(select(SystemSettings).limit(1))
    settings_row = result.scalar_one_or_none()
    nurturing_list_id = None
    if settings_row and settings_row.general_config:
        nurturing_list_id = settings_row.general_config.get("brevo_nurturing_list_id")

    contact_result = await create_or_update_contact(
        email=email,
        first_name=first_name,
        company=company,
        attributes={
            "SOURCE": source,
            "ICP_SCORE": str(icp_score),
            "ADDED_AT": datetime.now(timezone.utc).isoformat(),
        },
        list_ids=[nurturing_list_id] if nurturing_list_id else None,
    )

    return {
        "nurturing": True,
        "email": email,
        "list_id": nurturing_list_id,
        "contact": contact_result,
    }


async def check_reactivation(
    db: AsyncSession,
    email: str,
) -> dict:
    """Verifica si un lead en nurturing ha mostrado interés (2+ opens en 7 días).

    Si sí → re-evaluar ICP → posible re-ingreso al pipeline activo.
    """
    api_key = _get_api_key()
    if not api_key:
        return {"error": "Brevo API key not configured"}

    # Get contact events
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{API_BASE}/contacts/{email}",
            headers=_headers(api_key),
            timeout=10,
        )

    if resp.status_code != 200:
        return {"error": f"Contact not found: {resp.status_code}"}

    contact = resp.json()
    stats = contact.get("statistics", {})
    opens = stats.get("opened", [])

    # Check if 2+ opens in last 7 days
    recent_opens = 0
    seven_days_ago = datetime.now(timezone.utc).timestamp() - (7 * 24 * 3600)
    for event in opens:
        event_date = event.get("eventTime", "")
        if event_date:
            try:
                dt = datetime.fromisoformat(event_date.replace("Z", "+00:00"))
                if dt.timestamp() > seven_days_ago:
                    recent_opens += 1
            except (ValueError, TypeError):
                pass

    should_reactivate = recent_opens >= 2

    return {
        "email": email,
        "recent_opens": recent_opens,
        "should_reactivate": should_reactivate,
        "recommendation": "Re-evaluar ICP con AGENT-LEAD-001" if should_reactivate else "Mantener en nurturing",
    }
