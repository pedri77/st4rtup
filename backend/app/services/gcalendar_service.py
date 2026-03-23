"""
Google Calendar bidirectional sync service.
Sincroniza visitas del CRM con Google Calendar.
Requiere OAuth2 credentials (gcalendar_config en system_settings).
"""
import httpx
import logging
from typing import Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.models import SystemSettings
from app.core.config import settings as app_settings

logger = logging.getLogger(__name__)
TIMEOUT = 15.0
GCAL_API = "https://www.googleapis.com/calendar/v3"


async def _get_access_token(db: AsyncSession) -> str:
    """Obtiene access token refrescandolo si es necesario."""
    result = await db.execute(select(SystemSettings).limit(1))
    sys_settings = result.scalar_one_or_none()
    if not sys_settings or not sys_settings.gcalendar_config:
        raise ValueError("Google Calendar no configurado")

    config = sys_settings.gcalendar_config
    access_token = config.get("access_token", "")
    refresh_token = config.get("refresh_token", "")
    expires_at = config.get("expires_at", 0)

    # Refresh if expired
    import time
    if time.time() > expires_at - 60:
        client_id = config.get("client_id") or app_settings.GOOGLE_CALENDAR_CLIENT_ID if hasattr(app_settings, 'GOOGLE_CALENDAR_CLIENT_ID') else ""
        client_secret = config.get("client_secret") or app_settings.GOOGLE_CALENDAR_CLIENT_SECRET if hasattr(app_settings, 'GOOGLE_CALENDAR_CLIENT_SECRET') else ""

        if not refresh_token or not client_id:
            raise ValueError("Google Calendar: faltan credenciales para refresh")

        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.post("https://oauth2.googleapis.com/token", data={
                "client_id": client_id,
                "client_secret": client_secret,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            })
            if r.status_code != 200:
                raise ValueError(f"OAuth refresh failed: {r.text[:200]}")
            data = r.json()
            access_token = data["access_token"]
            config["access_token"] = access_token
            config["expires_at"] = time.time() + data.get("expires_in", 3600)
            sys_settings.gcalendar_config = config
            await db.commit()

    return access_token


async def create_calendar_event(
    db: AsyncSession,
    summary: str,
    description: str,
    start_dt: datetime,
    end_dt: Optional[datetime] = None,
    attendees: Optional[list] = None,
    location: str = "",
) -> dict:
    """Crea un evento en Google Calendar."""
    token = await _get_access_token(db)
    if not end_dt:
        end_dt = start_dt + timedelta(hours=1)

    event = {
        "summary": summary,
        "description": description,
        "start": {"dateTime": start_dt.isoformat(), "timeZone": "Europe/Madrid"},
        "end": {"dateTime": end_dt.isoformat(), "timeZone": "Europe/Madrid"},
    }
    if location:
        event["location"] = location
    if attendees:
        event["attendees"] = [{"email": a} for a in attendees if "@" in a]

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.post(
            f"{GCAL_API}/calendars/primary/events",
            headers={"Authorization": f"Bearer {token}"},
            json=event,
        )
        if r.status_code in (200, 201):
            data = r.json()
            return {"id": data.get("id"), "htmlLink": data.get("htmlLink"), "status": "created"}
        raise ValueError(f"Google Calendar error: {r.status_code} {r.text[:200]}")


async def update_calendar_event(
    db: AsyncSession,
    event_id: str,
    summary: Optional[str] = None,
    start_dt: Optional[datetime] = None,
    end_dt: Optional[datetime] = None,
    description: Optional[str] = None,
) -> dict:
    """Actualiza un evento existente en Google Calendar."""
    token = await _get_access_token(db)
    patch = {}
    if summary:
        patch["summary"] = summary
    if description:
        patch["description"] = description
    if start_dt:
        patch["start"] = {"dateTime": start_dt.isoformat(), "timeZone": "Europe/Madrid"}
    if end_dt:
        patch["end"] = {"dateTime": end_dt.isoformat(), "timeZone": "Europe/Madrid"}

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.patch(
            f"{GCAL_API}/calendars/primary/events/{event_id}",
            headers={"Authorization": f"Bearer {token}"},
            json=patch,
        )
        if r.status_code == 200:
            return {"id": event_id, "status": "updated"}
        raise ValueError(f"Google Calendar error: {r.status_code} {r.text[:200]}")


async def delete_calendar_event(db: AsyncSession, event_id: str) -> dict:
    """Elimina un evento de Google Calendar."""
    token = await _get_access_token(db)
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.delete(
            f"{GCAL_API}/calendars/primary/events/{event_id}",
            headers={"Authorization": f"Bearer {token}"},
        )
        if r.status_code in (200, 204):
            return {"status": "deleted"}
        raise ValueError(f"Google Calendar error: {r.status_code}")


async def list_calendar_events(
    db: AsyncSession,
    time_min: Optional[datetime] = None,
    time_max: Optional[datetime] = None,
    max_results: int = 50,
) -> list:
    """Lista eventos del Google Calendar."""
    token = await _get_access_token(db)
    params = {"maxResults": max_results, "singleEvents": "true", "orderBy": "startTime"}
    if time_min:
        params["timeMin"] = time_min.isoformat() + "Z"
    if time_max:
        params["timeMax"] = time_max.isoformat() + "Z"

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.get(
            f"{GCAL_API}/calendars/primary/events",
            headers={"Authorization": f"Bearer {token}"},
            params=params,
        )
        if r.status_code == 200:
            items = r.json().get("items", [])
            return [{
                "id": e.get("id"),
                "summary": e.get("summary", ""),
                "start": e.get("start", {}).get("dateTime", e.get("start", {}).get("date")),
                "end": e.get("end", {}).get("dateTime", e.get("end", {}).get("date")),
                "location": e.get("location", ""),
                "htmlLink": e.get("htmlLink", ""),
                "attendees": [a.get("email") for a in e.get("attendees", [])],
            } for e in items]
        raise ValueError(f"Google Calendar error: {r.status_code}")
