"""
PandaDoc integration — firma digital de propuestas y contratos.
API docs: https://developers.pandadoc.com/reference
"""
import httpx
import logging
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.models import SystemSettings

logger = logging.getLogger(__name__)
TIMEOUT = 20.0
PANDADOC_API = "https://api.pandadoc.com/public/v1"


async def _get_config(db: Optional[AsyncSession] = None) -> dict:
    if db:
        result = await db.execute(select(SystemSettings).limit(1))
        s = result.scalar_one_or_none()
        if s and s.pandadoc_config and s.pandadoc_config.get("api_key"):
            return s.pandadoc_config
    from app.core.config import settings
    if getattr(settings, "PANDADOC_API_KEY", ""):
        return {"api_key": settings.PANDADOC_API_KEY}
    raise ValueError("PandaDoc no configurado")


def _headers(api_key: str) -> dict:
    return {"Authorization": f"API-Key {api_key}", "Content-Type": "application/json"}


async def list_templates(db: Optional[AsyncSession] = None) -> list:
    cfg = await _get_config(db)
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.get(f"{PANDADOC_API}/templates", headers=_headers(cfg["api_key"]))
        r.raise_for_status()
        return [{"id": t["id"], "name": t["name"], "created_at": t.get("date_created")}
                for t in r.json().get("results", [])]


async def create_document(
    name: str, template_id: str = "",
    recipients: list[dict] = None,
    tokens: dict = None,
    db: Optional[AsyncSession] = None,
) -> dict:
    """Crea un documento desde template o en blanco.
    recipients: [{"email": "...", "first_name": "...", "last_name": "...", "role": "signer"}]
    tokens: {"client_name": "Empresa X", "amount": "19500"} — merge fields
    """
    cfg = await _get_config(db)
    payload = {"name": name}
    if template_id:
        payload["template_uuid"] = template_id
    if recipients:
        payload["recipients"] = recipients
    if tokens:
        payload["tokens"] = [{"name": k, "value": str(v)} for k, v in tokens.items()]

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.post(f"{PANDADOC_API}/documents", headers=_headers(cfg["api_key"]), json=payload)
        r.raise_for_status()
        data = r.json()
        return {"id": data["id"], "name": data.get("name"), "status": data.get("status"),
                "created_at": data.get("date_created")}


async def send_document(document_id: str, message: str = "", subject: str = "",
                         db: Optional[AsyncSession] = None) -> dict:
    """Envia un documento para firma."""
    cfg = await _get_config(db)
    payload = {"message": message or "Por favor, revise y firme el documento adjunto.", "silent": False}
    if subject:
        payload["subject"] = subject
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.post(f"{PANDADOC_API}/documents/{document_id}/send",
                              headers=_headers(cfg["api_key"]), json=payload)
        r.raise_for_status()
        return {"sent": True, "id": document_id}


async def get_document_status(document_id: str, db: Optional[AsyncSession] = None) -> dict:
    cfg = await _get_config(db)
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.get(f"{PANDADOC_API}/documents/{document_id}",
                             headers=_headers(cfg["api_key"]))
        r.raise_for_status()
        data = r.json()
        return {"id": data["id"], "name": data.get("name"), "status": data.get("status"),
                "completed_at": data.get("date_completed"), "expiration": data.get("expiration_date")}


async def get_document_link(document_id: str, recipient_email: str,
                             db: Optional[AsyncSession] = None) -> dict:
    """Genera un link de firma para un recipient."""
    cfg = await _get_config(db)
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.post(f"{PANDADOC_API}/documents/{document_id}/session",
                              headers=_headers(cfg["api_key"]),
                              json={"recipient": recipient_email, "lifetime": 900})
        r.raise_for_status()
        return {"session_id": r.json().get("id"), "expires_at": r.json().get("expires_at")}
