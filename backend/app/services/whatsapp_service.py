"""
WhatsApp Business Cloud API service.
Envia mensajes de texto y templates via Meta's WhatsApp Business API.
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
WA_API = "https://graph.facebook.com/v18.0"


async def _get_wa_config(db: Optional[AsyncSession] = None) -> dict:
    """Obtiene config WhatsApp desde system_settings o env vars."""
    if db:
        result = await db.execute(select(SystemSettings).limit(1))
        sys_settings = result.scalar_one_or_none()
        if sys_settings and sys_settings.whatsapp_config:
            cfg = sys_settings.whatsapp_config
            if cfg.get("access_token") and cfg.get("phone_number_id"):
                return cfg
    token = app_settings.WHATSAPP_ACCESS_TOKEN
    phone_id = app_settings.WHATSAPP_PHONE_NUMBER_ID
    if token and phone_id:
        return {"access_token": token, "phone_number_id": phone_id}
    raise ValueError("WhatsApp Business API no configurado")


async def send_text_message(
    to_phone: str,
    text: str,
    db: Optional[AsyncSession] = None,
) -> dict:
    """Envia un mensaje de texto via WhatsApp Business API."""
    config = await _get_wa_config(db)
    phone_id = config["phone_number_id"]
    token = config["access_token"]

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.post(
            f"{WA_API}/{phone_id}/messages",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "messaging_product": "whatsapp",
                "to": to_phone,
                "type": "text",
                "text": {"body": text},
            },
        )
        if r.status_code in (200, 201):
            data = r.json()
            msg_id = data.get("messages", [{}])[0].get("id", "")
            return {"success": True, "message_id": msg_id}
        raise ValueError(f"WhatsApp error: {r.status_code} {r.text[:200]}")


async def send_template_message(
    to_phone: str,
    template_name: str,
    language_code: str = "es",
    components: Optional[list] = None,
    db: Optional[AsyncSession] = None,
) -> dict:
    """Envia un mensaje de template via WhatsApp Business API."""
    config = await _get_wa_config(db)
    phone_id = config["phone_number_id"]
    token = config["access_token"]

    template = {
        "name": template_name,
        "language": {"code": language_code},
    }
    if components:
        template["components"] = components

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.post(
            f"{WA_API}/{phone_id}/messages",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "messaging_product": "whatsapp",
                "to": to_phone,
                "type": "template",
                "template": template,
            },
        )
        if r.status_code in (200, 201):
            data = r.json()
            msg_id = data.get("messages", [{}])[0].get("id", "")
            return {"success": True, "message_id": msg_id}
        raise ValueError(f"WhatsApp error: {r.status_code} {r.text[:200]}")


async def get_templates(db: Optional[AsyncSession] = None) -> list:
    """Lista templates de WhatsApp Business."""
    config = await _get_wa_config(db)
    token = config["access_token"]
    biz_id = config.get("business_account_id", app_settings.WHATSAPP_BUSINESS_ACCOUNT_ID)
    if not biz_id:
        return []

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.get(
            f"{WA_API}/{biz_id}/message_templates",
            headers={"Authorization": f"Bearer {token}"},
        )
        if r.status_code == 200:
            return r.json().get("data", [])
        return []


async def send_lead_notification(
    to_phone: str,
    lead_name: str,
    message: str,
    db: Optional[AsyncSession] = None,
) -> dict:
    """Envia notificacion de lead por WhatsApp."""
    text = f"*St4rtup CRM*\n\n*Lead:* {lead_name}\n{message}\n\nhttps://app.st4rtup.app/leads"
    return await send_text_message(to_phone, text, db)
