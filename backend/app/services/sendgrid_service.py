"""
SendGrid email service — alternativa a Resend para alto volumen.
API docs: https://docs.sendgrid.com/api-reference
"""
import httpx
import logging
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.models import SystemSettings

logger = logging.getLogger(__name__)
TIMEOUT = 15.0
SENDGRID_API = "https://api.sendgrid.com/v3"


async def _get_api_key(db: Optional[AsyncSession] = None) -> str:
    if db:
        result = await db.execute(select(SystemSettings).limit(1))
        s = result.scalar_one_or_none()
        if s and s.general_config and s.general_config.get("sendgrid_api_key"):
            return s.general_config["sendgrid_api_key"]
    from app.core.config import settings
    if getattr(settings, "SENDGRID_API_KEY", ""):
        return settings.SENDGRID_API_KEY
    raise ValueError("SendGrid no configurado")


async def send_email(
    to: str, subject: str, html_body: str,
    from_email: str = "hello@st4rtup.app",
    from_name: str = "St4rtup CRM",
    db: Optional[AsyncSession] = None,
) -> dict:
    api_key = await _get_api_key(db)
    payload = {
        "personalizations": [{"to": [{"email": to}]}],
        "from": {"email": from_email, "name": from_name},
        "subject": subject,
        "content": [{"type": "text/html", "value": html_body}],
    }
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.post(
            f"{SENDGRID_API}/mail/send",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=payload,
        )
        if r.status_code in (200, 202):
            msg_id = r.headers.get("X-Message-Id", "")
            return {"success": True, "message_id": msg_id, "provider": "sendgrid"}
        return {"success": False, "error": f"SendGrid {r.status_code}: {r.text[:200]}"}


async def add_to_contact_list(email: str, first_name: str = "", last_name: str = "",
                               list_id: str = "", db: Optional[AsyncSession] = None) -> dict:
    api_key = await _get_api_key(db)
    contact = {"email": email}
    if first_name:
        contact["first_name"] = first_name
    if last_name:
        contact["last_name"] = last_name
    payload = {"contacts": [contact]}
    if list_id:
        payload["list_ids"] = [list_id]
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.put(
            f"{SENDGRID_API}/marketing/contacts",
            headers={"Authorization": f"Bearer {api_key}"},
            json=payload,
        )
        if r.status_code in (200, 202):
            return {"success": True, "job_id": r.json().get("job_id")}
        return {"success": False, "error": f"{r.status_code}: {r.text[:200]}"}


async def get_stats(db: Optional[AsyncSession] = None) -> dict:
    api_key = await _get_api_key(db)
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.get(
            f"{SENDGRID_API}/stats",
            headers={"Authorization": f"Bearer {api_key}"},
            params={"limit": 1, "offset": 0, "aggregated_by": "month"},
        )
        if r.status_code == 200:
            data = r.json()
            if data:
                metrics = data[0].get("stats", [{}])[0].get("metrics", {})
                return {"requests": metrics.get("requests", 0), "delivered": metrics.get("delivered", 0),
                        "opens": metrics.get("opens", 0), "clicks": metrics.get("clicks", 0),
                        "bounces": metrics.get("bounces", 0)}
        return {}
