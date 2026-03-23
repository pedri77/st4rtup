"""
Servicio de notificaciones Slack y Microsoft Teams via webhooks/API.
Soporta Slack (Incoming Webhook + Bot API) y Teams (Incoming Webhook).
"""
import httpx
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.models import SystemSettings
from app.core.config import settings as app_settings

TIMEOUT = 15.0


# ── Slack ─────────────────────────────────────────────────────────

async def _get_slack_config(db: Optional[AsyncSession] = None) -> dict:
    """Obtiene config Slack desde system_settings o env vars."""
    if db:
        result = await db.execute(select(SystemSettings).limit(1))
        sys_settings = result.scalar_one_or_none()
        if sys_settings and sys_settings.slack_config:
            cfg = sys_settings.slack_config
            if cfg.get("webhook_url") or cfg.get("bot_token"):
                return cfg
    # Fallback env vars
    cfg = {}
    if app_settings.SLACK_WEBHOOK_URL:
        cfg["webhook_url"] = app_settings.SLACK_WEBHOOK_URL
    if app_settings.SLACK_BOT_TOKEN:
        cfg["bot_token"] = app_settings.SLACK_BOT_TOKEN
    if app_settings.SLACK_DEFAULT_CHANNEL:
        cfg["default_channel"] = app_settings.SLACK_DEFAULT_CHANNEL
    if cfg:
        return cfg
    raise ValueError("Slack no configurado")


async def send_slack_message(
    text: str,
    db: Optional[AsyncSession] = None,
    channel: Optional[str] = None,
    blocks: Optional[list] = None,
) -> dict:
    """Envia mensaje a Slack via webhook o Bot API."""
    config = await _get_slack_config(db)

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        # Prefer webhook (simpler, no scopes needed)
        if config.get("webhook_url"):
            payload = {"text": text}
            if blocks:
                payload["blocks"] = blocks
            r = await client.post(config["webhook_url"], json=payload)
            if r.status_code == 200:
                return {"ok": True}
            raise ValueError(f"Slack webhook error: {r.status_code} {r.text[:200]}")

        # Bot API fallback
        bot_token = config.get("bot_token", "")
        target_channel = channel or config.get("default_channel", "")
        if not bot_token or not target_channel:
            raise ValueError("Se requiere webhook_url o bot_token+channel")

        payload = {"channel": target_channel, "text": text}
        if blocks:
            payload["blocks"] = blocks
        r = await client.post(
            "https://slack.com/api/chat.postMessage",
            headers={"Authorization": f"Bearer {bot_token}"},
            json=payload,
        )
        data = r.json()
        if data.get("ok"):
            return data
        raise ValueError(f"Slack API error: {data.get('error', 'unknown')}")


async def test_slack_connection(config: dict) -> dict:
    """Verifica conexion Slack (webhook o bot)."""
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        if config.get("webhook_url"):
            r = await client.post(config["webhook_url"], json={"text": "St4rtup CRM — Conexion Slack verificada"})
            if r.status_code == 200:
                return {"success": True, "message": "Webhook Slack conectado correctamente"}
            return {"success": False, "error": f"Error {r.status_code}: {r.text[:200]}"}

        bot_token = config.get("bot_token", "")
        if not bot_token:
            return {"success": False, "error": "Se requiere webhook_url o bot_token"}
        r = await client.post(
            "https://slack.com/api/auth.test",
            headers={"Authorization": f"Bearer {bot_token}"},
        )
        data = r.json()
        if data.get("ok"):
            return {"success": True, "message": f"Conectado al workspace: {data.get('team', '')}"}
        return {"success": False, "error": f"Slack error: {data.get('error', 'unknown')}"}


# ── Microsoft Teams ──────────────────────────────────────────────

async def _get_teams_config(db: Optional[AsyncSession] = None) -> dict:
    """Obtiene config Teams desde system_settings o env vars."""
    if db:
        result = await db.execute(select(SystemSettings).limit(1))
        sys_settings = result.scalar_one_or_none()
        if sys_settings and sys_settings.teams_config:
            cfg = sys_settings.teams_config
            if cfg.get("webhook_url"):
                return cfg
    # Fallback env vars
    if app_settings.TEAMS_WEBHOOK_URL:
        return {"webhook_url": app_settings.TEAMS_WEBHOOK_URL}
    raise ValueError("Microsoft Teams no configurado")


async def send_teams_message(
    text: str,
    db: Optional[AsyncSession] = None,
    title: Optional[str] = None,
    color: str = "0078D4",
) -> dict:
    """Envia mensaje a Teams via Incoming Webhook (Adaptive Card)."""
    config = await _get_teams_config(db)
    webhook_url = config["webhook_url"]

    # Adaptive Card format (works with new Teams webhooks)
    card = {
        "type": "message",
        "attachments": [{
            "contentType": "application/vnd.microsoft.card.adaptive",
            "content": {
                "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                "type": "AdaptiveCard",
                "version": "1.4",
                "body": [],
            }
        }]
    }
    body = card["attachments"][0]["content"]["body"]
    if title:
        body.append({"type": "TextBlock", "text": title, "weight": "Bolder", "size": "Medium", "color": "Accent"})
    body.append({"type": "TextBlock", "text": text, "wrap": True})

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        r = await client.post(webhook_url, json=card)
        if r.status_code in (200, 202):
            return {"ok": True}
        raise ValueError(f"Teams webhook error: {r.status_code} {r.text[:200]}")


async def test_teams_connection(config: dict) -> dict:
    """Verifica conexion Microsoft Teams webhook."""
    webhook_url = config.get("webhook_url", "")
    if not webhook_url:
        return {"success": False, "error": "Se requiere webhook_url"}
    try:
        await send_teams_message(
            text="St4rtup CRM — Conexion Teams verificada",
            title="Test de Conexion",
        )
        return {"success": True, "message": "Webhook Teams conectado correctamente"}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ── Dispatch unificado ───────────────────────────────────────────

async def notify_all_channels(
    db: AsyncSession,
    title: str,
    message: str,
):
    """Envia notificacion a todos los canales configurados (Slack + Teams).
    Silencia errores individuales — cada canal es opcional."""
    # Slack
    try:
        text = f"*{title}*\n{message}"
        await send_slack_message(text, db)
    except Exception:
        pass

    # Teams
    try:
        await send_teams_message(message, db, title=title)
    except Exception:
        pass
