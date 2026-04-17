"""
Endpoints de chat con IA multi-proveedor.
Permite crear conversaciones, enviar mensajes y recibir respuestas de múltiples proveedores de IA.
"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.core.database import get_db
from app.core.tenant import get_org_id
from app.core.security import get_current_user
from app.core.permissions import require_write_access
from app.models import ChatConversation, ChatMessage, SystemSettings
from app.schemas.chat import (
    ConversationCreate, ConversationUpdate, ConversationResponse,
    ConversationWithMessages, ChatSendRequest, ChatSendResponse,
    ChatMessageResponse, AIProviderInfo,
)
from app.services.ai_chat_service import ai_chat_service
from app.core.config import settings

import logging
logger = logging.getLogger(__name__)

router = APIRouter()


def _get_ai_config(settings_row: Optional[SystemSettings]) -> dict:
    """Obtener configuración AI desde la DB o defaults."""
    if settings_row and settings_row.ai_config:
        return settings_row.ai_config
    return {}


def _get_system_prompt(settings_row: Optional[SystemSettings], conversation: Optional[ChatConversation] = None) -> str:
    """Obtener system prompt: conversación > DB > default."""
    if conversation and conversation.system_prompt:
        return conversation.system_prompt
    ai_config = _get_ai_config(settings_row)
    return ai_config.get("system_prompt", settings.AI_SYSTEM_PROMPT)


@router.get("/providers", response_model=list[AIProviderInfo])
async def list_providers(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Listar proveedores de IA disponibles con sus modelos."""
    result = await db.execute(select(SystemSettings).limit(1))
    settings_row = result.scalar_one_or_none()
    ai_config = _get_ai_config(settings_row)

    # Map provider IDs to their actual env var names
    ENV_KEY_MAP = {
        "openai": "OPENAI_API_KEY",
        "anthropic": "ANTHROPIC_API_KEY",
        "google": "GOOGLE_AI_API_KEY",
        "mistral": "MISTRAL_API_KEY",
        "groq": "GROQ_API_KEY",
        "ollama": "OLLAMA_BASE_URL",
        "deepseek": "DEEPSEEK_API_KEY",
    }

    providers = []
    for p in ai_chat_service.get_available_providers():
        try:
            provider_cfg = ai_config.get(p["id"], {})
            env_key_name = ENV_KEY_MAP.get(p["id"], "")
            has_env_key = bool(getattr(settings, env_key_name, "")) if env_key_name else False
            has_db_key = bool(provider_cfg.get("api_key") or provider_cfg.get("base_url"))

            providers.append(AIProviderInfo(
                id=p["id"],
                name=p["name"],
                models=p["models"],
                configured=has_env_key or has_db_key or p["id"] == "ollama",
            ))
        except Exception as e:
            logger.warning("Error checking provider %s: %s", p.get("id"), e)
            providers.append(AIProviderInfo(
                id=p.get("id", "unknown"),
                name=p.get("name", "Unknown"),
                models=p.get("models", []),
                configured=False,
            ))
    return providers


@router.get("/conversations", response_model=list[ConversationResponse])
async def list_conversations(
    is_archived: Optional[bool] = None,
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Listar conversaciones del usuario actual."""
    user_id = UUID(current_user["user_id"])
    query = select(ChatConversation).where(ChatConversation.user_id == user_id)

    if is_archived is not None:
        query = query.where(ChatConversation.is_archived == is_archived)

    query = query.order_by(ChatConversation.updated_at.desc()).limit(limit)
    result = await db.execute(query)
    conversations = result.scalars().all()
    return [ConversationResponse.model_validate(c) for c in conversations]


@router.post("/conversations", response_model=ConversationResponse, status_code=201)
async def create_conversation(
    data: ConversationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Crear una nueva conversación."""
    user_id = UUID(current_user["user_id"])

    # Get default model for provider if not specified
    provider_info = ai_chat_service.PROVIDERS.get(data.provider)
    if not provider_info:
        raise HTTPException(status_code=400, detail=f"Proveedor desconocido: {data.provider}")

    model = data.model or provider_info["models"][0]

    conversation = ChatConversation(
        user_id=user_id,
        title=data.title or "Nueva conversación",
        provider=data.provider,
        model=model,
        system_prompt=data.system_prompt,
    )
    db.add(conversation)
    await db.commit()
    await db.refresh(conversation)
    return ConversationResponse.model_validate(conversation)


@router.get("/conversations/{conversation_id}", response_model=ConversationWithMessages)
async def get_conversation(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Obtener una conversación con todos sus mensajes."""
    user_id = UUID(current_user["user_id"])
    result = await db.execute(
        select(ChatConversation).where(
            ChatConversation.id == conversation_id,
            ChatConversation.user_id == user_id,
        )
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversación no encontrada")

    # Load messages
    msg_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.conversation_id == conversation_id)
        .order_by(ChatMessage.created_at)
    )
    messages = msg_result.scalars().all()

    conv_data = ConversationWithMessages.model_validate(conversation)
    conv_data.messages = [ChatMessageResponse.model_validate(m) for m in messages]
    return conv_data


@router.put("/conversations/{conversation_id}", response_model=ConversationResponse)
async def update_conversation(
    conversation_id: UUID,
    data: ConversationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Actualizar título o system prompt de una conversación."""
    user_id = UUID(current_user["user_id"])
    result = await db.execute(
        select(ChatConversation).where(
            ChatConversation.id == conversation_id,
            ChatConversation.user_id == user_id,
        )
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversación no encontrada")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(conversation, key, value)

    await db.commit()
    await db.refresh(conversation)
    return ConversationResponse.model_validate(conversation)


@router.delete("/conversations/{conversation_id}", status_code=204)
async def delete_conversation(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Eliminar una conversación y todos sus mensajes."""
    user_id = UUID(current_user["user_id"])
    result = await db.execute(
        select(ChatConversation).where(
            ChatConversation.id == conversation_id,
            ChatConversation.user_id == user_id,
        )
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversación no encontrada")

    await db.delete(conversation)
    await db.commit()


@router.post("/conversations/{conversation_id}/messages", response_model=ChatSendResponse)
async def send_message(
    conversation_id: UUID,
    data: ChatSendRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Enviar un mensaje y recibir respuesta de la IA."""
    user_id = UUID(current_user["user_id"])

    # Get conversation
    result = await db.execute(
        select(ChatConversation).where(
            ChatConversation.id == conversation_id,
            ChatConversation.user_id == user_id,
        )
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversación no encontrada")

    # Get AI config from system settings
    settings_result = await db.execute(select(SystemSettings).limit(1))
    settings_row = settings_result.scalar_one_or_none()
    ai_config = _get_ai_config(settings_row)
    system_prompt = _get_system_prompt(settings_row, conversation)

    # Determine provider and model
    provider = data.provider or conversation.provider
    model = data.model or conversation.model
    provider_cfg = ai_config.get(provider, {})

    # Save user message
    user_msg = ChatMessage(
        conversation_id=conversation.id,
        role="user",
        content=data.message,
    )
    db.add(user_msg)
    await db.flush()

    # Load conversation history for context
    msg_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.conversation_id == conversation.id)
        .order_by(ChatMessage.created_at)
    )
    history = msg_result.scalars().all()

    # Build messages list (limit to last 50 messages for context window)
    chat_messages = []
    for msg in history[-50:]:
        chat_messages.append({"role": msg.role, "content": msg.content})

    # Business context: inject real CRM data into system prompt
    try:
        from app.services.chat_context_builder import build_business_context
        biz_context = await build_business_context(db, user_id)
        if biz_context:
            system_prompt = f"{system_prompt}{biz_context}"
    except Exception as biz_err:
        logger.debug(f"Business context skipped: {biz_err}")

    # RAG: retrieve relevant context from Qdrant
    try:
        from app.services.rag_service import search_context
        rag_results = await search_context(data.message, top_k=3)
        if rag_results:
            rag_context = "\n".join([f"- {r['text']}" for r in rag_results if r.get('text')])
            system_prompt = f"{system_prompt}\n\nContexto relevante del producto:\n{rag_context}"
    except Exception as rag_err:
        logger.debug(f"RAG context retrieval skipped: {rag_err}")

    # Call AI provider
    ai_result = await ai_chat_service.chat(
        provider=provider,
        messages=chat_messages,
        model=model,
        system_prompt=system_prompt,
        config=provider_cfg,
        temperature=data.temperature or 0.7,
        max_tokens=data.max_tokens or 2048,
    )

    # Save assistant message
    assistant_msg = ChatMessage(
        conversation_id=conversation.id,
        role="assistant",
        content=ai_result.get("content", ""),
        provider=ai_result.get("provider"),
        model=ai_result.get("model"),
        tokens_input=ai_result.get("tokens_input", 0),
        tokens_output=ai_result.get("tokens_output", 0),
        duration_ms=ai_result.get("duration_ms"),
        error=ai_result.get("error"),
    )
    db.add(assistant_msg)

    # Update conversation stats
    conversation.message_count = (conversation.message_count or 0) + 2
    conversation.total_tokens = (conversation.total_tokens or 0) + ai_result.get("tokens_input", 0) + ai_result.get("tokens_output", 0)

    # Auto-title on first message
    if conversation.message_count <= 2 and conversation.title == "Nueva conversación":
        conversation.title = data.message[:80] + ("..." if len(data.message) > 80 else "")

    await db.commit()
    await db.refresh(user_msg)
    await db.refresh(assistant_msg)
    await db.refresh(conversation)

    return ChatSendResponse(
        user_message=ChatMessageResponse.model_validate(user_msg),
        assistant_message=ChatMessageResponse.model_validate(assistant_msg),
        conversation=ConversationResponse.model_validate(conversation),
    )


@router.post("/conversations/{conversation_id}/stream")
async def stream_message(
    conversation_id: UUID,
    data: ChatSendRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Enviar un mensaje y recibir respuesta en streaming (SSE)."""
    user_id = UUID(current_user["user_id"])

    result = await db.execute(
        select(ChatConversation).where(
            ChatConversation.id == conversation_id,
            ChatConversation.user_id == user_id,
        )
    )
    conversation = result.scalar_one_or_none()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversación no encontrada")

    # Get config
    settings_result = await db.execute(select(SystemSettings).limit(1))
    settings_row = settings_result.scalar_one_or_none()
    ai_config = _get_ai_config(settings_row)
    system_prompt = _get_system_prompt(settings_row, conversation)

    provider = data.provider or conversation.provider
    model = data.model or conversation.model
    provider_cfg = ai_config.get(provider, {})

    # Save user message
    user_msg = ChatMessage(
        conversation_id=conversation.id,
        role="user",
        content=data.message,
    )
    db.add(user_msg)

    # Load history
    msg_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.conversation_id == conversation.id)
        .order_by(ChatMessage.created_at)
    )
    history = msg_result.scalars().all()
    chat_messages = [{"role": m.role, "content": m.content} for m in history[-50:]]
    chat_messages.append({"role": "user", "content": data.message})

    # Auto-title
    if (conversation.message_count or 0) == 0 and conversation.title == "Nueva conversación":
        conversation.title = data.message[:80] + ("..." if len(data.message) > 80 else "")

    await db.commit()

    import json

    async def event_stream():
        full_response = ""
        try:
            async for chunk in ai_chat_service.stream_chat(
                provider=provider,
                messages=chat_messages,
                model=model,
                system_prompt=system_prompt,
                config=provider_cfg,
                temperature=data.temperature or 0.7,
                max_tokens=data.max_tokens or 2048,
            ):
                full_response += chunk
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"

            # Save the complete assistant message
            async with db.begin():
                assistant_msg = ChatMessage(
                    conversation_id=conversation.id,
                    role="assistant",
                    content=full_response,
                    provider=provider,
                    model=model,
                )
                db.add(assistant_msg)
                await db.execute(
                    update(ChatConversation)
                    .where(ChatConversation.id == conversation.id)
                    .values(
                        message_count=ChatConversation.message_count + 2,
                    )
                )

            yield f"data: {json.dumps({'type': 'done', 'content': full_response})}\n\n"

        except Exception as e:
            logger.warning(f"Stream error: {e}", exc_info=True)
            yield f"data: {json.dumps({'type': 'error', 'error': 'Error processing AI response'})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/public")
async def public_chat(request: Request):
    """Public chat endpoint for website widget (no auth)."""
    body = await request.json()
    message = body.get("message", "")
    if not message:
        return {"response": ""}

    PRODUCT_CONTEXT = """
SOBRE ST4RTUP:
St4rtup es un CRM de ventas y marketing diseñado para startups. Incluye:
- Pipeline visual Kanban con drag & drop
- Marketing Hub: campañas, SEO Command Center (9 tabs), funnels, assets
- 4 Agentes IA: scoring ICP, cualificación BANT, propuestas, customer success
- Llamadas IA con Retell AI (batch, A/B testing, RGPD)
- 28 automatizaciones preconfiguradas
- 14 gráficos y dashboards en tiempo real
- WhatsApp Business con chatbot IA
- Deal Room con firma digital NDA
- Integraciones: Gmail, Google Drive, Stripe, PayPal, YouTube, Airtable, Slack
- Multi-idioma: ES, EN, PT

PRECIOS:
- Starter: €0/mes (1 usuario, 100 leads)
- Growth: €19/mes (3 usuarios, 5.000 leads, IA, marketing, SEO)
- Scale: €49/mes (10 usuarios, ilimitado, deal room, API)
- Prueba gratis: 7 días del plan Growth

WEB: https://st4rtup.com
DEMO: https://st4rtup.com/demo
PRICING: https://st4rtup.com/pricing
DOCS: https://st4rtup.com/app/docs
"""

    try:
        result = await ai_chat_service.chat(
            provider=settings.AI_DEFAULT_PROVIDER,
            messages=[{"role": "user", "content": message}],
            system_prompt=(
                "Eres el asistente de St4rtup CRM. Responde preguntas sobre el producto, "
                "funcionalidades, precios y ventas B2B para startups. "
                "Sé amable, profesional y conciso (max 150 palabras). "
                "Si detectas interés comercial, sugiere la prueba gratuita de 7 días. "
                "Usa este contexto del producto:\n" + PRODUCT_CONTEXT
            ),
        )
        return {"response": result.get("content", "Lo siento, no pude procesar tu mensaje.")}
    except Exception as e:
        logger.warning("Public chat error: %s", e)
        return {"response": "Disculpa, estoy teniendo problemas técnicos. Escríbenos a hello@st4rtup.com"}
