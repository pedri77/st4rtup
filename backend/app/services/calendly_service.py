"""
Calendly integration — agendar demos automaticamente despues de llamadas IA.
API docs: https://developer.calendly.com/api-docs/v2
"""
import httpx
import logging
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.models import SystemSettings

logger = logging.getLogger(__name__)
TIMEOUT = 15.0
CALENDLY_API = "https://api.calendly.com"


async def _get_config(db: Optional[AsyncSession] = None) -> dict:
    if db:
        result = await db.execute(select(SystemSettings).limit(1))
        s = result.scalar_one_or_none()
        if s and s.calendly_config and s.calendly_config.get("api_key"):
            return s.calendly_config
    from app.core.config import settings
    if getattr(settings, "CALENDLY_API_KEY", ""):
        return {"api_key": settings.CALENDLY_API_KEY}
    raise ValueError("Calendly no configurado")


def _headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


async def get_current_user(db: Optional[AsyncSession] = None) -> dict:
    cfg = await _get_config(db)
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.get(f"{CALENDLY_API}/users/me", headers=_headers(cfg["api_key"]))
        r.raise_for_status()
        return r.json().get("resource", {})


async def get_event_types(db: Optional[AsyncSession] = None) -> list:
    cfg = await _get_config(db)
    user = await get_current_user(db)
    user_uri = user.get("uri", "")
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.get(
            f"{CALENDLY_API}/event_types",
            headers=_headers(cfg["api_key"]),
            params={"user": user_uri, "active": True},
        )
        r.raise_for_status()
        return [
            {"uri": et["uri"], "name": et["name"], "slug": et["slug"],
             "duration": et["duration"], "scheduling_url": et["scheduling_url"]}
            for et in r.json().get("collection", [])
        ]


async def list_scheduled_events(db: Optional[AsyncSession] = None, count: int = 20) -> list:
    cfg = await _get_config(db)
    user = await get_current_user(db)
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.get(
            f"{CALENDLY_API}/scheduled_events",
            headers=_headers(cfg["api_key"]),
            params={"user": user.get("uri"), "count": count, "status": "active",
                    "sort": "start_time:asc"},
        )
        r.raise_for_status()
        return [
            {"uri": ev["uri"], "name": ev["name"], "status": ev["status"],
             "start_time": ev["start_time"], "end_time": ev["end_time"],
             "location": ev.get("location", {}).get("location", ""),
             "invitees_count": ev.get("invitees_counter", {}).get("total", 0)}
            for ev in r.json().get("collection", [])
        ]


async def create_scheduling_link(event_type_uri: str, db: Optional[AsyncSession] = None) -> dict:
    """Crea un link de agendamiento one-off para un tipo de evento."""
    cfg = await _get_config(db)
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.post(
            f"{CALENDLY_API}/scheduling_links",
            headers=_headers(cfg["api_key"]),
            json={"max_event_count": 1, "owner": event_type_uri, "owner_type": "EventType"},
        )
        r.raise_for_status()
        data = r.json().get("resource", {})
        return {"booking_url": data.get("booking_url"), "owner": data.get("owner")}
