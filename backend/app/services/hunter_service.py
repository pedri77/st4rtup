"""
Servicio Hunter.io para verificacion y busqueda de emails.
API docs: https://hunter.io/api-documentation/v2
"""
import httpx
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.models import SystemSettings
from app.core.config import settings as app_settings

TIMEOUT = 15.0
BASE_URL = "https://api.hunter.io/v2"


async def _get_api_key(db: Optional[AsyncSession] = None) -> str:
    """Obtiene API key desde system_settings o env vars."""
    if db:
        result = await db.execute(select(SystemSettings).limit(1))
        sys_settings = result.scalar_one_or_none()
        if sys_settings and sys_settings.hunter_config:
            key = sys_settings.hunter_config.get("api_key", "")
            if key:
                return key
    if app_settings.HUNTER_API_KEY:
        return app_settings.HUNTER_API_KEY
    raise ValueError("Hunter.io no configurado: falta api_key")


async def verify_email(email: str, db: Optional[AsyncSession] = None) -> dict:
    """Verifica un email con Hunter.io Email Verifier.
    Returns: {result, score, email, status, ...}"""
    api_key = await _get_api_key(db)
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.get(f"{BASE_URL}/email-verifier", params={"email": email, "api_key": api_key})
        if r.status_code != 200:
            raise ValueError(f"Hunter.io error: {r.status_code} {r.text[:200]}")
        data = r.json().get("data", {})
        return {
            "email": data.get("email", email),
            "result": data.get("result", "unknown"),  # deliverable, undeliverable, risky, unknown
            "score": data.get("score", 0),
            "status": data.get("status", "unknown"),
            "disposable": data.get("disposable", False),
            "webmail": data.get("webmail", False),
            "mx_records": data.get("mx_records", False),
            "smtp_server": data.get("smtp_server", False),
            "smtp_check": data.get("smtp_check", False),
            "accept_all": data.get("accept_all", False),
            "sources": data.get("sources", 0),
        }


async def find_emails(domain: str, db: Optional[AsyncSession] = None) -> dict:
    """Busca emails asociados a un dominio (Domain Search).
    Returns: {domain, emails: [...], organization, ...}"""
    api_key = await _get_api_key(db)
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.get(f"{BASE_URL}/domain-search", params={"domain": domain, "api_key": api_key})
        if r.status_code != 200:
            raise ValueError(f"Hunter.io error: {r.status_code} {r.text[:200]}")
        data = r.json().get("data", {})
        emails = []
        for e in data.get("emails", []):
            emails.append({
                "email": e.get("value", ""),
                "type": e.get("type", ""),
                "confidence": e.get("confidence", 0),
                "first_name": e.get("first_name", ""),
                "last_name": e.get("last_name", ""),
                "position": e.get("position", ""),
                "department": e.get("department", ""),
            })
        return {
            "domain": data.get("domain", domain),
            "organization": data.get("organization", ""),
            "emails": emails,
            "total": data.get("total", 0),
        }


async def get_account_info(db: Optional[AsyncSession] = None) -> dict:
    """Obtiene info de la cuenta Hunter.io (creditos, uso)."""
    api_key = await _get_api_key(db)
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.get(f"{BASE_URL}/account", params={"api_key": api_key})
        if r.status_code != 200:
            raise ValueError(f"Hunter.io error: {r.status_code}")
        data = r.json().get("data", {})
        return {
            "email": data.get("email", ""),
            "plan": data.get("plan_name", ""),
            "requests_used": data.get("requests", {}).get("searches", {}).get("used", 0),
            "requests_available": data.get("requests", {}).get("searches", {}).get("available", 0),
            "verifications_used": data.get("requests", {}).get("verifications", {}).get("used", 0),
            "verifications_available": data.get("requests", {}).get("verifications", {}).get("available", 0),
        }
