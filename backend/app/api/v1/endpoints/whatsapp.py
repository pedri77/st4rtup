"""WhatsApp Business — conversaciones, mensajes, webhook."""
from typing import Optional
from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.tenant import get_org_id
from app.core.permissions import require_write_access
from app.models.wa_conversation import WAConversation, WAMessage
from app.models.lead import Lead
from app.services.whatsapp_service import send_text_message, get_templates

router = APIRouter()


@router.get("/conversations")
async def list_conversations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20),
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    org_id: str = Depends(get_org_id),
):
    query = select(WAConversation)
    query = query.where(WAConversation.org_id == org_id)
    if status:
        query = query.where(WAConversation.status == status)
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar()
    query = query.order_by(desc(WAConversation.last_message_at)).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    convos = result.scalars().all()
    return {
        "items": [{
            "id": str(c.id), "phone": c.phone, "lead_id": str(c.lead_id) if c.lead_id else None,
            "lead_name": c.lead_name, "status": c.status, "unread_count": c.unread_count,
            "bot_enabled": c.bot_enabled, "last_message_at": c.last_message_at.isoformat() if c.last_message_at else None,
        } for c in convos],
        "total": total, "page": page, "page_size": page_size,
    }


@router.get("/conversations/{conv_id}/messages")
async def get_messages(
    conv_id: UUID, page: int = Query(1), page_size: int = Query(50),
    db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user),
):
    total = (await db.execute(select(func.count(WAMessage.id)).where(WAMessage.conversation_id == conv_id))).scalar()
    result = await db.execute(
        select(WAMessage).where(WAMessage.conversation_id == conv_id)
        .order_by(desc(WAMessage.created_at)).offset((page - 1) * page_size).limit(page_size)
    )
    msgs = result.scalars().all()
    # Mark as read
    conv = await db.get(WAConversation, conv_id)
    if conv:
        conv.unread_count = 0
        await db.commit()
    return {
        "items": [{
            "id": str(m.id), "direction": m.direction, "message_type": m.message_type,
            "content": m.content, "status": m.status, "sender_name": m.sender_name,
            "created_at": m.created_at.isoformat(),
        } for m in reversed(msgs)],
        "total": total,
    }


@router.post("/send")
async def send_message(
    phone: str = Query(...), text: str = Query(..., max_length=4096),
    lead_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Envia mensaje WhatsApp y registra en conversacion."""
    # Find or create conversation
    result = await db.execute(select(WAConversation).where(WAConversation.phone == phone))
    conv = result.scalar_one_or_none()
    if not conv:
        lead_name = ""
        if lead_id:
            lead = await db.get(Lead, lead_id)
            lead_name = lead.company_name if lead else ""
        conv = WAConversation(phone=phone, lead_id=lead_id, lead_name=lead_name, status="active")
        db.add(conv)
        await db.flush()

    # Send via WhatsApp API
    try:
        result = await send_text_message(phone, text, db)
        wa_msg_id = result.get("message_id", "")
    except Exception as e:
        raise HTTPException(status_code=502, detail="WhatsApp service error")

    # Save message
    msg = WAMessage(
        conversation_id=conv.id, direction="outbound", message_type="text",
        content=text, wa_message_id=wa_msg_id, status="sent",
    )
    db.add(msg)
    conv.last_message_at = datetime.now(timezone.utc)
    await db.commit()
    return {"success": True, "message_id": wa_msg_id, "conversation_id": str(conv.id)}


@router.post("/webhook")
async def whatsapp_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Webhook receptor de mensajes entrantes de WhatsApp."""
    body = await request.json()

    # Process incoming messages
    entries = body.get("entry", [])
    processed = 0
    for entry in entries:
        for change in entry.get("changes", []):
            value = change.get("value", {})
            messages = value.get("messages", [])
            contacts = value.get("contacts", [])

            for msg in messages:
                phone = msg.get("from", "")
                msg_type = msg.get("type", "text")
                content = ""
                if msg_type == "text":
                    content = msg.get("text", {}).get("body", "")
                elif msg_type in ("image", "document", "audio", "video"):
                    content = f"[{msg_type}]"

                sender_name = ""
                for contact in contacts:
                    if contact.get("wa_id") == phone:
                        sender_name = contact.get("profile", {}).get("name", "")

                # Find or create conversation
                result = await db.execute(select(WAConversation).where(WAConversation.phone == phone))
                conv = result.scalar_one_or_none()
                if not conv:
                    # Try to match with existing lead by phone
                    lead_match = await db.execute(select(Lead).where(Lead.contact_phone.contains(phone[-9:])))
                    lead = lead_match.scalar_one_or_none()
                    conv = WAConversation(
                        phone=phone, lead_id=lead.id if lead else None,
                        lead_name=lead.company_name if lead else sender_name,
                        status="active", bot_enabled=True,
                    )
                    db.add(conv)
                    await db.flush()

                # Save message
                wa_msg = WAMessage(
                    conversation_id=conv.id, direction="inbound", message_type=msg_type,
                    content=content, wa_message_id=msg.get("id", ""),
                    sender_phone=phone, sender_name=sender_name,
                )
                db.add(wa_msg)
                conv.last_message_at = datetime.now(timezone.utc)
                conv.unread_count = (conv.unread_count or 0) + 1
                processed += 1

                # Auto-respond with chatbot if enabled
                if conv.bot_enabled and content:
                    try:
                        from app.services.ai_chat_service import AIChatService
                        from app.core.config import settings
                        service = AIChatService()
                        bot_response = await service.chat(
                            provider=settings.AI_DEFAULT_PROVIDER,
                            messages=[{"role": "user", "content": content}],
                            system_prompt="Eres el asistente comercial de St4rtup, plataforma growth de tecnología. Respondes en español, eres amable y profesional. Si el usuario pregunta por precios, agenda una demo en https://st4rtup.app/demo. Si detectas una necesidad de compliance (ENS, NIS2, DORA, SaaS Best Practices), cualifica el lead. Respuestas cortas (max 200 palabras).",
                        )
                        bot_text = bot_response.get("content", "")[:4096]
                        if bot_text:
                            await send_text_message(phone, bot_text, db)
                            bot_msg = WAMessage(
                                conversation_id=conv.id, direction="outbound", message_type="text",
                                content=bot_text, status="sent", sender_name="Bot IA",
                            )
                            db.add(bot_msg)
                    except Exception as e:
                        import logging
                        logging.getLogger(__name__).warning("WA bot error: %s", e)

    await db.commit()
    return {"status": "ok", "processed": processed}


@router.get("/webhook")
async def whatsapp_webhook_verify(request: Request):
    """Meta webhook verification (GET)."""
    mode = request.query_params.get("hub.mode")
    token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")
    # Accept any verify_token for now
    if mode == "subscribe":
        return int(challenge) if challenge else challenge
    return {"status": "ok"}


@router.get("/templates")
async def list_templates(db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    templates = await get_templates(db)
    return {"templates": templates}


@router.post("/conversations/{conv_id}/toggle-bot")
async def toggle_bot(conv_id: UUID, db: AsyncSession = Depends(get_db), current_user: dict = Depends(require_write_access)):
    conv = await db.get(WAConversation, conv_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversacion no encontrada")
    conv.bot_enabled = not conv.bot_enabled
    conv.status = "bot" if conv.bot_enabled else "escalated"
    await db.commit()
    return {"bot_enabled": conv.bot_enabled, "status": conv.status}


@router.get("/stats")
async def whatsapp_stats(db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    total_convos = await db.scalar(select(func.count(WAConversation.id))) or 0
    active = await db.scalar(select(func.count(WAConversation.id)).where(WAConversation.status == "active")) or 0
    total_msgs = await db.scalar(select(func.count(WAMessage.id))) or 0
    inbound = await db.scalar(select(func.count(WAMessage.id)).where(WAMessage.direction == "inbound")) or 0
    unread = await db.scalar(select(func.coalesce(func.sum(WAConversation.unread_count), 0))) or 0
    bot_active = await db.scalar(select(func.count(WAConversation.id)).where(WAConversation.bot_enabled == True)) or 0
    return {
        "total_conversations": total_convos, "active": active,
        "total_messages": total_msgs, "inbound": inbound, "outbound": total_msgs - inbound,
        "unread": int(unread), "bot_active": bot_active,
    }
