"""Servicio de integración con Retell AI para llamadas con IA."""
import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.config import settings
from app.models.call import CallRecord, CallPrompt
from app.models.lead import Lead
from app.models.crm import Visit, Email, Action

logger = logging.getLogger(__name__)

RETELL_BASE_URL = "https://api.retellai.com/v2"

# Scoring rules post-llamada
CALL_SCORE_RULES = {
    "demo_agendada": 25,
    "interesado": 15,
    "propuesta_solicitada": 20,
    "callback": 5,
    "sin_respuesta": 0,
    "buzon": -2,
    "no_interesado": -15,
}

SENTIMENT_MODIFIER = {
    "positivo": 5,
    "neutral": 0,
    "negativo": -5,
}

# Status triggers
STATUS_TRIGGERS = {
    "demo_agendada": "qualified",
    "propuesta_solicitada": "proposal",
}


def is_configured() -> bool:
    """Verifica si Retell AI está configurado."""
    return bool(settings.RETELL_API_KEY)


def _interpolate_prompt(template: str, variables: dict) -> str:
    """Interpola variables {{var}} en un template."""
    result = template
    for key, value in variables.items():
        result = result.replace(f"{{{{{key}}}}}", str(value or ""))
    return result


async def _get_last_interaction(db: AsyncSession, lead_id: UUID) -> str:
    """Calcula la última interacción del lead desde visitas, emails y acciones."""
    # Buscar la actividad más reciente entre visitas, emails enviados y acciones
    latest_visit = await db.scalar(
        select(Visit.visit_date)
        .where(Visit.lead_id == lead_id)
        .order_by(desc(Visit.visit_date))
        .limit(1)
    )
    latest_email = await db.scalar(
        select(Email.sent_at)
        .where(Email.lead_id == lead_id, Email.sent_at.isnot(None))
        .order_by(desc(Email.sent_at))
        .limit(1)
    )
    latest_action = await db.scalar(
        select(Action.completed_at)
        .where(Action.lead_id == lead_id, Action.completed_at.isnot(None))
        .order_by(desc(Action.completed_at))
        .limit(1)
    )
    latest_call = await db.scalar(
        select(CallRecord.created_at)
        .where(CallRecord.lead_id == lead_id)
        .order_by(desc(CallRecord.created_at))
        .limit(1)
    )

    # Encontrar la más reciente
    dates = [d for d in [latest_visit, latest_email, latest_action, latest_call] if d]
    if not dates:
        return ""

    most_recent = max(dates)
    if hasattr(most_recent, 'strftime'):
        return most_recent.strftime("%d/%m/%Y")
    return str(most_recent)


async def _build_variables(db: AsyncSession, lead: Lead, user_name: str = "") -> dict:
    """Construye las variables dinámicas a partir de un lead."""
    frameworks = ", ".join(lead.regulatory_frameworks or []) if lead.regulatory_frameworks else ""
    last_interaction = await _get_last_interaction(db, lead.id)
    return {
        "lead_nombre": lead.contact_name or "",
        "lead_empresa": lead.company_name or "",
        "lead_cargo": lead.contact_title or "",
        "regulatory_focus": frameworks,
        "last_interaction": last_interaction,
        "demo_fecha": "",
        "score": str(lead.score or 0),
        "stage": str(lead.status.value if lead.status else ""),
        "agente_nombre": user_name,
        "company_sector": lead.company_sector or "",
        "company_size": lead.company_size or "",
    }


async def initiate_call(
    db: AsyncSession,
    lead_id: UUID,
    prompt_id: UUID,
    user_id: UUID,
    user_name: str = "",
    to_number: Optional[str] = None,
    consent: bool = False,
) -> dict:
    """Inicia una llamada outbound via Retell AI."""

    # Obtener lead
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        return {"error": "Lead no encontrado"}

    # Obtener prompt
    result = await db.execute(select(CallPrompt).where(CallPrompt.id == prompt_id))
    prompt = result.scalar_one_or_none()
    if not prompt:
        return {"error": "Prompt no encontrado"}

    phone = to_number or lead.contact_phone
    if not phone:
        return {"error": "El lead no tiene número de teléfono"}

    # Crear registro de llamada
    call = CallRecord(
        lead_id=lead_id,
        prompt_id=prompt_id,
        prompt_version=prompt.version,
        initiated_by=user_id,
        estado="iniciando",
        score_antes=lead.score,
        consentimiento_grabacion=consent,
    )
    db.add(call)
    await db.flush()

    # Construir variables
    variables = await _build_variables(db, lead, user_name)

    # Si Retell no está configurado, simular llamada
    if not is_configured():
        call.estado = "finalizada"
        call.retell_call_id = f"sim_{call.id}"
        call.duracion_segundos = 0
        call.notas_agente = "Retell AI no configurado — llamada simulada"
        await db.commit()
        await db.refresh(call)
        return {
            "call_id": str(call.id),
            "retell_call_id": call.retell_call_id,
            "estado": call.estado,
            "simulated": True,
            "message": "Retell API key not configured. Call simulated.",
        }

    # Llamar a Retell API
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{RETELL_BASE_URL}/create-phone-call",
                headers={
                    "Authorization": f"Bearer {settings.RETELL_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "from_number": settings.RETELL_FROM_NUMBER,
                    "to_number": phone,
                    "agent_id": settings.RETELL_AGENT_ID_DEFAULT,
                    "retell_llm_dynamic_variables": variables,
                    "metadata": {
                        "lead_id": str(lead_id),
                        "prompt_id": str(prompt_id),
                        "call_record_id": str(call.id),
                        "initiated_by": str(user_id),
                    },
                },
            )

            if resp.status_code in (200, 201):
                data = resp.json()
                call.retell_call_id = data.get("call_id")
                call.retell_agent_id = data.get("agent_id")
                call.estado = "conectando"
                await db.commit()
                await db.refresh(call)
                return {
                    "call_id": str(call.id),
                    "retell_call_id": call.retell_call_id,
                    "estado": call.estado,
                    "simulated": False,
                }
            else:
                error_msg = f"Retell API error {resp.status_code}: {resp.text}"
                logger.error(error_msg)
                call.estado = "fallida"
                call.notas_agente = error_msg
                await db.commit()
                return {"error": error_msg, "call_id": str(call.id)}

    except Exception as e:
        logger.error("Error calling Retell API: %s", str(e))
        call.estado = "fallida"
        call.notas_agente = str(e)
        await db.commit()
        return {"error": str(e), "call_id": str(call.id)}


async def handle_retell_webhook(db: AsyncSession, payload: dict) -> dict:
    """Procesa webhook de Retell AI."""
    event = payload.get("event", "")
    call_data = payload.get("call", payload.get("data", {}))
    retell_call_id = call_data.get("call_id", "")

    if not retell_call_id:
        return {"status": "ignored", "reason": "no call_id"}

    # Buscar call record
    result = await db.execute(
        select(CallRecord).where(CallRecord.retell_call_id == retell_call_id)
    )
    call = result.scalar_one_or_none()
    if not call:
        # Intentar buscar por metadata
        metadata = call_data.get("metadata", {})
        call_record_id = metadata.get("call_record_id")
        if call_record_id:
            result = await db.execute(
                select(CallRecord).where(CallRecord.id == call_record_id)
            )
            call = result.scalar_one_or_none()

    if not call:
        logger.warning("CallRecord not found for retell_call_id: %s", retell_call_id)
        return {"status": "not_found"}

    if event == "call_started":
        call.estado = "activa"
        call.retell_call_id = retell_call_id

    elif event == "call_ended":
        call.estado = "finalizada"
        call.fecha_fin = datetime.now(timezone.utc)
        start_ts = call_data.get("start_timestamp")
        end_ts = call_data.get("end_timestamp")
        if start_ts and end_ts:
            call.duracion_segundos = int((end_ts - start_ts) / 1000)
        elif call.fecha_inicio:
            delta = call.fecha_fin - call.fecha_inicio
            call.duracion_segundos = int(delta.total_seconds())

        # Calcular coste
        if call.duracion_segundos:
            minutes = call.duracion_segundos / 60
            call.minutos_facturados = round(minutes, 2)
            call.coste_eur = round(minutes * settings.RETELL_COST_PER_MINUTE, 4)

        # Disconnection reason
        disconnect = call_data.get("disconnection_reason", "")
        if disconnect == "no_answer":
            call.estado = "no_contesta"
        elif disconnect == "voicemail":
            call.estado = "buzon"

    elif event == "call_analyzed":
        transcript = call_data.get("transcript", "")
        if transcript:
            call.transcripcion = transcript
        call.turnos_conversacion = call_data.get("turn_count", 0)
        call.latencia_media_ms = call_data.get("avg_latency_ms")

        # Analizar con IA si hay transcripción
        if call.transcripcion:
            analysis = await _analyze_transcript(call.transcripcion)
            if analysis:
                call.resumen_ia = analysis.get("resumen")
                call.sentiment = analysis.get("sentiment")
                call.sentiment_score = analysis.get("sentiment_score")
                if not call.resultado:
                    call.resultado = analysis.get("resultado_sugerido")
                if not call.siguiente_accion:
                    call.siguiente_accion = analysis.get("siguiente_accion")

    await db.commit()

    # Auto BANT analysis post-call con AGENT-QUALIFY-001
    if event == "call_analyzed" and call.transcripcion and call.lead_id:
        try:
            from app.agents.bant_qualifier import qualify_call
            bant_result = await qualify_call(
                db, call_id=call.id, transcript=call.transcripcion, lead_id=call.lead_id
            )
            if bant_result.get("bant_score"):
                call.metadata_ = {
                    **(call.metadata_ or {}),
                    "bant": {
                        "score": bant_result["bant_score"],
                        "hitl_required": bant_result.get("hitl_required", False),
                        "objections": bant_result.get("objections", []),
                    }
                }
                await db.commit()

                # HITL-2 notification si objeción compleja
                if bant_result.get("hitl_required") and call.lead_id:
                    from app.models.notification import NotificationType, NotificationPriority
                    from app.services.notification_service import notification_service
                    # Notify all admins
                    from app.models import User, UserRole
                    admins = (await db.execute(
                        select(User.id).where(User.role == UserRole.ADMIN)
                    )).scalars().all()
                    for admin_id in admins:
                        await notification_service.create_notification(
                            db=db, user_id=admin_id,
                            type=NotificationType.LEAD,
                            priority=NotificationPriority.URGENT,
                            title="HITL-2: Objeción compleja en llamada",
                            message=f"BANT Score: {bant_result['bant_score']}/100 — {bant_result.get('hitl_reason', '')}",
                        )
        except Exception:
            logger.debug("Auto-BANT skipped (no LLM configured)", exc_info=False)

    return {"status": "processed", "event": event, "call_id": str(call.id)}


async def complete_call(
    db: AsyncSession,
    call_id: UUID,
    resultado: str,
    siguiente_accion: Optional[str] = None,
    fecha_siguiente: Optional[datetime] = None,
    notas_agente: Optional[str] = None,
) -> dict:
    """Completa una llamada con el resultado del agente."""
    result = await db.execute(select(CallRecord).where(CallRecord.id == call_id))
    call = result.scalar_one_or_none()
    if not call:
        return {"error": "Llamada no encontrada"}

    call.resultado = resultado
    call.siguiente_accion = siguiente_accion
    call.fecha_siguiente = fecha_siguiente
    call.notas_agente = notas_agente

    if call.estado not in ("finalizada", "no_contesta", "buzon"):
        call.estado = "finalizada"
        call.fecha_fin = datetime.now(timezone.utc)

    # Actualizar score del lead
    lead_result = await db.execute(select(Lead).where(Lead.id == call.lead_id))
    lead = lead_result.scalar_one_or_none()
    if lead:
        call.score_antes = lead.score or 0
        score_delta = CALL_SCORE_RULES.get(resultado, 0)
        if call.sentiment:
            score_delta += SENTIMENT_MODIFIER.get(call.sentiment, 0)
        new_score = max(0, min(100, (lead.score or 0) + score_delta))
        lead.score = new_score
        call.score_despues = new_score

        # Mover status si procede
        new_status = STATUS_TRIGGERS.get(resultado)
        if new_status:
            from app.models.enums import LeadStatus
            try:
                lead.status = LeadStatus(new_status)
            except ValueError:
                pass

    await db.commit()
    await db.refresh(call)

    return {
        "call_id": str(call.id),
        "resultado": call.resultado,
        "score_antes": call.score_antes,
        "score_despues": call.score_despues,
    }


async def _analyze_transcript(transcript: str) -> Optional[dict]:
    """Analiza una transcripción con el servicio de IA."""
    try:
        from app.services.ai_chat_service import AIChatService
        service = AIChatService()

        prompt = f"""Analiza esta transcripción de una llamada comercial de St4rtup CRM (plataforma de ventas para startups).

Responde SOLO en JSON con este formato exacto:
{{
  "resumen": "Resumen de 3-5 líneas de la llamada",
  "sentiment": "positivo|neutral|negativo",
  "sentiment_score": 0.0,
  "resultado_sugerido": "interesado|no_interesado|callback|demo_agendada|propuesta_solicitada|sin_respuesta",
  "siguiente_accion": "Acción sugerida para el seguimiento"
}}

Transcripción:
{transcript[:3000]}"""

        response = await service.chat(
            messages=[{"role": "user", "content": prompt}],
            system_prompt="Eres un analista de ventas. Responde solo en JSON válido.",
        )

        # Intentar parsear JSON
        import json
        text = response.get("content", "")
        # Limpiar posible markdown
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]
        return json.loads(text.strip())

    except Exception as e:
        logger.error("Error analyzing transcript: %s", str(e))
        return None
