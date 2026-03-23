"""
Servicio de notificaciones Telegram via Bot API.
Envia mensajes a un chat/grupo configurado con formato HTML.
"""
import html
import httpx
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.models import SystemSettings
from app.core.config import settings as app_settings

TIMEOUT = 15.0
TELEGRAM_API = "https://api.telegram.org"


async def _get_telegram_config(db: Optional[AsyncSession] = None) -> dict:
    """Obtiene bot_token y chat_id desde system_settings o env vars."""
    if db:
        result = await db.execute(select(SystemSettings).limit(1))
        sys_settings = result.scalar_one_or_none()
        if sys_settings and sys_settings.telegram_config:
            config = sys_settings.telegram_config
            if config.get("bot_token") and config.get("chat_id"):
                return config

    # Fallback to env vars
    token = app_settings.TELEGRAM_BOT_TOKEN
    chat_id = app_settings.TELEGRAM_CHAT_ID
    if token and chat_id:
        return {"bot_token": token, "chat_id": chat_id}

    raise ValueError("Telegram no configurado: falta bot_token o chat_id")


async def send_message(
    text: str,
    db: Optional[AsyncSession] = None,
    parse_mode: str = "HTML",
    disable_preview: bool = True,
) -> dict:
    """Envia un mensaje de texto al chat configurado."""
    config = await _get_telegram_config(db)
    bot_token = config["bot_token"]
    chat_id = config["chat_id"]

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        response = await client.post(
            f"{TELEGRAM_API}/bot{bot_token}/sendMessage",
            json={
                "chat_id": chat_id,
                "text": text,
                "parse_mode": parse_mode,
                "disable_web_page_preview": disable_preview,
            },
        )
        data = response.json()
        if not data.get("ok"):
            raise ValueError(f"Telegram error: {data.get('description', 'Unknown error')}")
        return data


async def test_connection(config: dict) -> dict:
    """Verifica que el bot y chat_id son validos."""
    bot_token = config.get("bot_token", "")
    chat_id = config.get("chat_id", "")

    if not bot_token or not chat_id:
        raise ValueError("Se requiere bot_token y chat_id")

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        # Verify bot token
        me_response = await client.get(f"{TELEGRAM_API}/bot{bot_token}/getMe")
        me_data = me_response.json()
        if not me_data.get("ok"):
            raise ValueError(f"Bot token invalido: {me_data.get('description')}")

        bot_name = me_data["result"].get("username", "")

        # Send test message
        test_response = await client.post(
            f"{TELEGRAM_API}/bot{bot_token}/sendMessage",
            json={
                "chat_id": chat_id,
                "text": "✅ <b>St4rtup CRM</b> — Conexion verificada correctamente.",
                "parse_mode": "HTML",
            },
        )
        test_data = test_response.json()
        if not test_data.get("ok"):
            raise ValueError(f"No se pudo enviar al chat {chat_id}: {test_data.get('description')}")

        return {"bot_username": bot_name, "chat_id": chat_id, "status": "connected"}


# ── Notification helpers ──────────────────────────────────────────

async def notify_new_lead(db: AsyncSession, lead_name: str, source: str, email: str = ""):
    """Notifica nuevo lead captado."""
    text = (
        "🆕 <b>Nuevo Lead</b>\n"
        f"Empresa: <b>{html.escape(lead_name)}</b>\n"
        f"Fuente: {html.escape(source)}\n"
    )
    if email:
        text += f"Email: {html.escape(email)}\n"
    text += "\n📋 <a href='https://app.st4rtup.app/leads'>Ver en CRM</a>"
    try:
        await send_message(text, db)
    except Exception:
        pass


async def notify_opportunity_stage(
    db: AsyncSession, lead_name: str, opportunity_title: str, old_stage: str, new_stage: str, value: float = 0
):
    """Notifica cambio de etapa en pipeline."""
    emoji = "📈" if new_stage in ("negotiation", "proposal", "closed_won") else "📉"
    text = (
        f"{emoji} <b>Pipeline — Cambio de etapa</b>\n"
        f"Oportunidad: <b>{html.escape(opportunity_title)}</b>\n"
        f"Cuenta: {html.escape(lead_name)}\n"
        f"Etapa: {html.escape(old_stage)} → <b>{html.escape(new_stage)}</b>\n"
    )
    if value:
        text += f"Valor: {value:,.0f} EUR\n"
    text += "\n📊 <a href='https://app.st4rtup.app/pipeline'>Ver Pipeline</a>"
    try:
        await send_message(text, db)
    except Exception:
        pass


async def notify_deal_won(db: AsyncSession, lead_name: str, opportunity_title: str, value: float):
    """Notifica deal ganado."""
    text = (
        "🎉 <b>DEAL GANADO</b> 🎉\n\n"
        f"Cuenta: <b>{html.escape(lead_name)}</b>\n"
        f"Oportunidad: {html.escape(opportunity_title)}\n"
        f"Valor: <b>{value:,.0f} EUR</b>\n"
        "\n🏆 <a href='https://app.st4rtup.app/pipeline'>Ver Pipeline</a>"
    )
    try:
        await send_message(text, db)
    except Exception:
        pass


async def notify_deal_lost(db: AsyncSession, lead_name: str, opportunity_title: str, reason: str = ""):
    """Notifica deal perdido."""
    text = (
        "❌ <b>Deal Perdido</b>\n"
        f"Cuenta: <b>{html.escape(lead_name)}</b>\n"
        f"Oportunidad: {html.escape(opportunity_title)}\n"
    )
    if reason:
        text += f"Motivo: {html.escape(reason)}\n"
    text += "\n📊 <a href='https://app.st4rtup.app/pipeline'>Ver Pipeline</a>"
    try:
        await send_message(text, db)
    except Exception:
        pass


async def notify_action_overdue(db: AsyncSession, action_title: str, lead_name: str, due_date: str):
    """Notifica accion vencida."""
    text = (
        "⚠️ <b>Accion Vencida</b>\n"
        f"Accion: <b>{html.escape(action_title)}</b>\n"
        f"Cuenta: {html.escape(lead_name)}\n"
        f"Vencimiento: {html.escape(due_date)}\n"
        "\n📋 <a href='https://app.st4rtup.app/actions'>Ver Acciones</a>"
    )
    try:
        await send_message(text, db)
    except Exception:
        pass


async def notify_offer_signed(db: AsyncSession, lead_name: str, reference: str, total: float):
    """Notifica oferta firmada."""
    text = (
        "✍️ <b>Oferta Firmada</b>\n"
        f"Referencia: <b>{html.escape(reference)}</b>\n"
        f"Cuenta: {html.escape(lead_name)}\n"
        f"Importe: <b>{total:,.0f} EUR</b>\n"
        "\n📄 <a href='https://app.st4rtup.app/offers'>Ver Ofertas</a>"
    )
    try:
        await send_message(text, db)
    except Exception:
        pass


async def notify_daily_summary(
    db: AsyncSession,
    total_leads: int,
    new_leads_today: int,
    actions_overdue: int,
    actions_today: int,
    pipeline_value: float,
    deals_won_month: int,
):
    """Envia resumen diario de actividad."""
    text = (
        "📊 <b>Resumen Diario — St4rtup CRM</b>\n\n"
        f"👥 Leads totales: <b>{total_leads}</b> (+{new_leads_today} hoy)\n"
        f"⚠️ Acciones vencidas: <b>{actions_overdue}</b>\n"
        f"📅 Acciones para hoy: <b>{actions_today}</b>\n"
        f"💰 Pipeline: <b>{pipeline_value:,.0f} EUR</b>\n"
        f"🏆 Deals ganados (mes): <b>{deals_won_month}</b>\n"
        "\n<a href='https://app.st4rtup.app'>Abrir CRM</a>"
    )
    try:
        await send_message(text, db)
    except Exception:
        pass


async def notify_invoice_paid(db: AsyncSession, lead_name: str, invoice_number: str, amount: float):
    """Notifica factura pagada."""
    text = (
        "💶 <b>Factura Pagada</b>\n"
        f"Factura: <b>{html.escape(invoice_number)}</b>\n"
        f"Cliente: {html.escape(lead_name)}\n"
        f"Importe: <b>{amount:,.0f} EUR</b>\n"
        "\n📄 <a href='https://app.st4rtup.app/offers'>Ver Ofertas</a>"
    )
    try:
        await send_message(text, db)
    except Exception:
        pass
