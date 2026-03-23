"""
Twilio integration — SMS + llamadas directas (complementa Retell AI).
API docs: https://www.twilio.com/docs/usage/api
"""
import httpx
import logging
from base64 import b64encode
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.models import SystemSettings

logger = logging.getLogger(__name__)
TIMEOUT = 15.0
TWILIO_API = "https://api.twilio.com/2010-04-01"


async def _get_config(db: Optional[AsyncSession] = None) -> dict:
    if db:
        result = await db.execute(select(SystemSettings).limit(1))
        s = result.scalar_one_or_none()
        if s and s.general_config:
            cfg = s.general_config.get("twilio", {})
            if cfg.get("account_sid") and cfg.get("auth_token"):
                return cfg
    from app.core.config import settings
    sid = getattr(settings, "TWILIO_ACCOUNT_SID", "")
    token = getattr(settings, "TWILIO_AUTH_TOKEN", "")
    if sid and token:
        return {"account_sid": sid, "auth_token": token,
                "from_number": getattr(settings, "TWILIO_FROM_NUMBER", "")}
    raise ValueError("Twilio no configurado")


def _auth(cfg: dict) -> str:
    encoded = b64encode(f"{cfg['account_sid']}:{cfg['auth_token']}".encode()).decode()
    return f"Basic {encoded}"


async def send_sms(to: str, body: str, db: Optional[AsyncSession] = None) -> dict:
    cfg = await _get_config(db)
    from_number = cfg.get("from_number", "")
    if not from_number:
        return {"success": False, "error": "No from_number configured"}

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.post(
            f"{TWILIO_API}/Accounts/{cfg['account_sid']}/Messages.json",
            headers={"Authorization": _auth(cfg)},
            data={"To": to, "From": from_number, "Body": body},
        )
        if r.status_code == 201:
            data = r.json()
            return {"success": True, "sid": data.get("sid"), "status": data.get("status")}
        return {"success": False, "error": f"Twilio {r.status_code}: {r.text[:200]}"}


async def make_call(to: str, twiml_url: str = "", db: Optional[AsyncSession] = None) -> dict:
    """Inicia una llamada. twiml_url: URL que devuelve TwiML con las instrucciones."""
    cfg = await _get_config(db)
    from_number = cfg.get("from_number", "")
    if not from_number:
        return {"success": False, "error": "No from_number configured"}
    if not twiml_url:
        twiml_url = "http://demo.twilio.com/docs/voice.xml"

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.post(
            f"{TWILIO_API}/Accounts/{cfg['account_sid']}/Calls.json",
            headers={"Authorization": _auth(cfg)},
            data={"To": to, "From": from_number, "Url": twiml_url},
        )
        if r.status_code == 201:
            data = r.json()
            return {"success": True, "sid": data.get("sid"), "status": data.get("status")}
        return {"success": False, "error": f"Twilio {r.status_code}: {r.text[:200]}"}


async def get_account_info(db: Optional[AsyncSession] = None) -> dict:
    cfg = await _get_config(db)
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.get(
            f"{TWILIO_API}/Accounts/{cfg['account_sid']}.json",
            headers={"Authorization": _auth(cfg)},
        )
        if r.status_code == 200:
            data = r.json()
            return {"friendly_name": data.get("friendly_name"), "status": data.get("status"),
                    "type": data.get("type")}
        return {"error": f"Twilio {r.status_code}"}
