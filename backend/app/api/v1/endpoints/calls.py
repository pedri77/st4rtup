"""Endpoints para el módulo de Llamadas con IA (MOD-AICALLS-001)."""
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.tenant import get_org_id
from app.core.permissions import require_write_access
from app.models.call import CallPrompt, CallPromptVersion, CallRecord, CallQueue, CallQueueItem
from app.schemas.call import (
    CallPromptCreate, CallPromptUpdate, CallPromptResponse, CallPromptVersionResponse,
    CallInitiateRequest, CallCompleteRequest, CallRecordResponse,
    CallQueueCreate, CallQueueUpdate, CallQueueResponse, CallQueueDetailResponse,
    CallQueueItemResponse, CallQueueStatsResponse,
)
from app.schemas.base import PaginatedResponse
from app.services import retell_service
from app.services import call_queue_service

router = APIRouter()


# ─── Call Prompts ────────────────────────────────────────────

@router.get("/prompts", response_model=PaginatedResponse)
async def list_prompts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    objetivo: Optional[str] = None,
    activo: Optional[bool] = None,
    search: Optional[str] = Query(None, max_length=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    org_id: str = Depends(get_org_id),
):
    """Lista prompts de llamadas con filtros y paginación."""
    query = select(CallPrompt)
    query = query.where(CallPrompt.org_id == org_id)

    if objetivo:
        query = query.where(CallPrompt.objetivo == objetivo)
    if activo is not None:
        query = query.where(CallPrompt.activo == activo)
    if search:
        query = query.where(
            CallPrompt.nombre.ilike(f"%{search}%") |
            CallPrompt.system_prompt.ilike(f"%{search}%")
        )

    # Count
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    # Paginate
    query = query.order_by(desc(CallPrompt.created_at))
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    prompts = result.scalars().all()

    return {
        "items": [CallPromptResponse.model_validate(p) for p in prompts],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size if total else 0,
    }


@router.get("/prompts/{prompt_id}", response_model=CallPromptResponse)
async def get_prompt(
    prompt_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Obtiene un prompt por ID."""
    result = await db.execute(select(CallPrompt).where(CallPrompt.id == prompt_id))
    prompt = result.scalar_one_or_none()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt no encontrado")
    return CallPromptResponse.model_validate(prompt)


@router.post("/prompts", response_model=CallPromptResponse, status_code=201)
async def create_prompt(
    data: CallPromptCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Crea un nuevo prompt de llamada."""
    prompt = CallPrompt(
        **data.model_dump(),
        created_by=UUID(current_user["user_id"]),
        version=1,
    )
    db.add(prompt)
    await db.flush()

    # Crear snapshot v1
    version = CallPromptVersion(
        prompt_id=prompt.id,
        version=1,
        snapshot=data.model_dump(),
        created_by=UUID(current_user["user_id"]),
    )
    db.add(version)

    await db.commit()
    await db.refresh(prompt)
    return CallPromptResponse.model_validate(prompt)


@router.put("/prompts/{prompt_id}", response_model=CallPromptResponse)
async def update_prompt(
    prompt_id: UUID,
    data: CallPromptUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Actualiza un prompt y crea nueva versión."""
    result = await db.execute(select(CallPrompt).where(CallPrompt.id == prompt_id))
    prompt = result.scalar_one_or_none()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt no encontrado")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(prompt, key, value)

    prompt.version += 1

    # Snapshot de la nueva versión
    snapshot = CallPromptResponse.model_validate(prompt).model_dump()
    snapshot.pop("id", None)
    snapshot.pop("created_at", None)
    snapshot.pop("updated_at", None)
    version = CallPromptVersion(
        prompt_id=prompt.id,
        version=prompt.version,
        snapshot=snapshot,
        created_by=UUID(current_user["user_id"]),
    )
    db.add(version)

    await db.commit()
    await db.refresh(prompt)
    return CallPromptResponse.model_validate(prompt)


@router.delete("/prompts/{prompt_id}")
async def delete_prompt(
    prompt_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Elimina un prompt."""
    result = await db.execute(select(CallPrompt).where(CallPrompt.id == prompt_id))
    prompt = result.scalar_one_or_none()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt no encontrado")
    await db.delete(prompt)
    await db.commit()
    return {"detail": "Prompt eliminado"}


@router.get("/prompts/{prompt_id}/versions", response_model=list[CallPromptVersionResponse])
async def list_prompt_versions(
    prompt_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lista versiones históricas de un prompt."""
    result = await db.execute(
        select(CallPromptVersion)
        .where(CallPromptVersion.prompt_id == prompt_id)
        .order_by(desc(CallPromptVersion.version))
    )
    return [CallPromptVersionResponse.model_validate(v) for v in result.scalars().all()]


@router.post("/prompts/seed")
async def seed_prompts(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Crea 5 prompts semilla para ventas growth."""
    seeds = [
        {
            "nombre": "Prospección growth - Primer contacto",
            "objetivo": "prospecting",
            "persona_target": ["CEO", "DPO", "CTO"],
            "regulatory_focus": ["ENS", "NIS2", "DORA"],
            "idioma": "es",
            "system_prompt": (
                "Eres un consultor de ventas B2B de St4rtup. "
                "Tu objetivo es presentar la plataforma y generar interés. "
                "Habla de normativas como ENS, NIS2, DORA e SaaS Best Practices. "
                "Sé profesional pero cercano. No presiones. "
                "Si el contacto muestra interés, sugiere agendar una demo."
            ),
            "primer_mensaje": (
                "Hola {{lead_nombre}}, soy de St4rtup. Le llamo porque "
                "{{lead_empresa}} opera en un sector donde el cumplimiento de "
                "{{regulatory_focus}} es clave. ¿Tiene un momento para hablar "
                "sobre cómo simplificar la gestión growth?"
            ),
            "variables_dinamicas": ["lead_nombre", "lead_empresa", "regulatory_focus"],
            "objetivo_llamada": "Generar interés y agendar demo",
            "duracion_objetivo_min": 5,
            "max_duracion_min": 10,
        },
        {
            "nombre": "Seguimiento post-demo",
            "objetivo": "followup_demo",
            "persona_target": ["CEO", "DPO", "CTO", "IT Manager"],
            "regulatory_focus": ["any"],
            "idioma": "es",
            "system_prompt": (
                "Eres un consultor growth de St4rtup haciendo seguimiento tras una demo. "
                "Pregunta qué les pareció la demo, resuelve dudas, y busca avanzar "
                "hacia una propuesta. Menciona casos de éxito relevantes."
            ),
            "primer_mensaje": (
                "Hola {{lead_nombre}}, le llamo de St4rtup para hacer seguimiento "
                "de la demo que tuvimos con {{lead_empresa}}. ¿Qué tal le pareció? "
                "¿Han podido valorarlo internamente?"
            ),
            "variables_dinamicas": ["lead_nombre", "lead_empresa"],
            "objetivo_llamada": "Resolver dudas y avanzar a propuesta",
            "duracion_objetivo_min": 7,
            "max_duracion_min": 15,
        },
        {
            "nombre": "Cierre - Negociación final",
            "objetivo": "closing",
            "persona_target": ["CEO", "CFO", "CEO"],
            "regulatory_focus": ["any"],
            "idioma": "es",
            "system_prompt": (
                "Eres un consultor senior de St4rtup en fase de cierre. "
                "Negocia condiciones, ofrece planes flexibles, enfatiza ROI "
                "y plazos de cumplimiento normativo. Sé firme pero flexible. "
                "Puedes ofrecer: descuento early-bird, onboarding gratuito, o pilot."
            ),
            "primer_mensaje": (
                "Hola {{lead_nombre}}, soy de St4rtup. Quería retomar la "
                "conversación sobre la propuesta para {{lead_empresa}}. "
                "¿Han tenido tiempo de revisarla?"
            ),
            "variables_dinamicas": ["lead_nombre", "lead_empresa", "score"],
            "objetivo_llamada": "Cerrar acuerdo o definir próximos pasos concretos",
            "duracion_objetivo_min": 10,
            "max_duracion_min": 20,
        },
        {
            "nombre": "Reactivación de lead frío",
            "objetivo": "reactivation",
            "persona_target": ["CEO", "DPO", "IT Manager"],
            "regulatory_focus": ["ENS", "NIS2", "DORA"],
            "idioma": "es",
            "system_prompt": (
                "Eres un consultor growth de St4rtup recontactando un lead que "
                "mostró interés pero no avanzó. Menciona novedades: nuevas "
                "normativas (NIS2 Oct 2024, DORA Ene 2025), nuevas funcionalidades, "
                "casos de éxito recientes. No seas agresivo."
            ),
            "primer_mensaje": (
                "Hola {{lead_nombre}}, soy de St4rtup. Hablamos hace un tiempo "
                "sobre la gestión growth en {{lead_empresa}}. Le llamo porque hay "
                "novedades importantes en normativa que podrían afectarles. "
                "¿Tiene un momento?"
            ),
            "variables_dinamicas": ["lead_nombre", "lead_empresa", "last_interaction"],
            "objetivo_llamada": "Reactivar interés con novedades normativas",
            "duracion_objetivo_min": 5,
            "max_duracion_min": 10,
        },
        {
            "nombre": "Cualificación BANT",
            "objetivo": "qualification",
            "persona_target": ["CEO", "DPO", "CTO", "IT Manager"],
            "regulatory_focus": ["any"],
            "idioma": "es",
            "system_prompt": (
                "Eres un SDR de St4rtup cualificando un lead usando BANT: "
                "Budget (presupuesto para growth), Authority (decisor), "
                "Need (necesidades de cumplimiento), Timeline (plazos). "
                "Haz preguntas abiertas. Toma notas mentales. "
                "Si cualifica, sugiere demo con un consultor senior."
            ),
            "primer_mensaje": (
                "Hola {{lead_nombre}}, soy de St4rtup. Hemos visto que "
                "{{lead_empresa}} podría beneficiarse de nuestra plataforma growth. "
                "Me gustaría entender mejor sus necesidades de cumplimiento. "
                "¿Cómo gestionan actualmente la normativa {{regulatory_focus}}?"
            ),
            "variables_dinamicas": ["lead_nombre", "lead_empresa", "regulatory_focus", "company_sector"],
            "objetivo_llamada": "Cualificar lead usando framework BANT",
            "duracion_objetivo_min": 7,
            "max_duracion_min": 12,
        },
    ]

    created = 0
    for seed in seeds:
        # Check if already exists
        exists = await db.execute(
            select(CallPrompt).where(CallPrompt.nombre == seed["nombre"])
        )
        if exists.scalar_one_or_none():
            continue

        prompt = CallPrompt(
            **seed,
            created_by=UUID(current_user["user_id"]),
            version=1,
            activo=True,
        )
        db.add(prompt)
        await db.flush()

        version = CallPromptVersion(
            prompt_id=prompt.id,
            version=1,
            snapshot=seed,
            created_by=UUID(current_user["user_id"]),
        )
        db.add(version)
        created += 1

    await db.commit()
    return {"detail": f"{created} prompts creados", "total": created}


# ─── Call Records ────────────────────────────────────────────

@router.get("/", response_model=PaginatedResponse)
async def list_calls(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    lead_id: Optional[UUID] = None,
    estado: Optional[str] = None,
    resultado: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lista registros de llamadas con filtros y paginación."""
    query = select(CallRecord)
    query = query.where(CallRecord.org_id == org_id)

    if lead_id:
        query = query.where(CallRecord.lead_id == lead_id)
    if estado:
        query = query.where(CallRecord.estado == estado)
    if resultado:
        query = query.where(CallRecord.resultado == resultado)

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    query = query.order_by(desc(CallRecord.fecha_inicio))
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    calls = result.scalars().all()

    return {
        "items": [CallRecordResponse.model_validate(c) for c in calls],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size if total else 0,
    }


@router.get("/stats")
async def call_stats(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Estadísticas generales de llamadas."""
    total = (await db.execute(select(func.count(CallRecord.id)))).scalar() or 0
    finalizadas = (await db.execute(
        select(func.count(CallRecord.id)).where(CallRecord.estado == "finalizada")
    )).scalar() or 0
    activas = (await db.execute(
        select(func.count(CallRecord.id)).where(CallRecord.estado.in_(["iniciando", "conectando", "activa"]))
    )).scalar() or 0
    fallidas = (await db.execute(
        select(func.count(CallRecord.id)).where(CallRecord.estado == "fallida")
    )).scalar() or 0

    avg_duration = (await db.execute(
        select(func.avg(CallRecord.duracion_segundos)).where(CallRecord.duracion_segundos.isnot(None))
    )).scalar()

    total_cost = (await db.execute(
        select(func.sum(CallRecord.coste_eur)).where(CallRecord.coste_eur.isnot(None))
    )).scalar()

    # Resultados breakdown
    resultado_counts = {}
    for r in ["demo_agendada", "interesado", "propuesta_solicitada", "callback", "sin_respuesta", "no_interesado", "buzon"]:
        count = (await db.execute(
            select(func.count(CallRecord.id)).where(CallRecord.resultado == r)
        )).scalar() or 0
        resultado_counts[r] = count

    return {
        "total": total,
        "finalizadas": finalizadas,
        "activas": activas,
        "fallidas": fallidas,
        "avg_duration_seconds": round(avg_duration, 1) if avg_duration else 0,
        "total_cost_eur": round(total_cost, 2) if total_cost else 0,
        "resultados": resultado_counts,
        "retell_configured": retell_service.is_configured(),
    }


@router.get("/{call_id}", response_model=CallRecordResponse)
async def get_call(
    call_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Obtiene detalle de una llamada."""
    result = await db.execute(select(CallRecord).where(CallRecord.id == call_id))
    call = result.scalar_one_or_none()
    if not call:
        raise HTTPException(status_code=404, detail="Llamada no encontrada")
    return CallRecordResponse.model_validate(call)


@router.post("/initiate", response_model=dict)
async def initiate_call(
    data: CallInitiateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Inicia una llamada outbound via Retell AI."""
    result = await retell_service.initiate_call(
        db=db,
        lead_id=data.lead_id,
        prompt_id=data.prompt_id,
        user_id=UUID(current_user["user_id"]),
        user_name=current_user.get("full_name", ""),
        to_number=data.to_number,
        consent=data.consent,
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post("/{call_id}/complete", response_model=dict)
async def complete_call(
    call_id: UUID,
    data: CallCompleteRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Completa una llamada con el resultado del agente."""
    result = await retell_service.complete_call(
        db=db,
        call_id=call_id,
        resultado=data.resultado,
        siguiente_accion=data.siguiente_accion,
        fecha_siguiente=data.fecha_siguiente,
        notas_agente=data.notas_agente,
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


# ─── Retell Webhook (público) ────────────────────────────────

@router.post("/retell-webhook")
async def retell_webhook(
    payload: dict,
    db: AsyncSession = Depends(get_db),
):
    """Webhook receptor de eventos Retell AI (sin auth)."""
    return await retell_service.handle_retell_webhook(db, payload)


# ─── Call Queues (Fase 2) ────────────────────────────────────

@router.get("/queues", response_model=PaginatedResponse)
async def list_queues(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lista colas de llamadas."""
    query = select(CallQueue)
    if status:
        query = query.where(CallQueue.status == status)

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    query = query.order_by(desc(CallQueue.created_at))
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    queues = result.scalars().all()

    return {
        "items": [CallQueueResponse.model_validate(q) for q in queues],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size if total else 0,
    }


@router.get("/queues/stats", response_model=CallQueueStatsResponse)
async def queue_stats(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Estadísticas globales de colas."""
    stats = await call_queue_service.get_queue_stats(db)
    return stats


@router.get("/queues/{queue_id}", response_model=CallQueueDetailResponse)
async def get_queue(
    queue_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Detalle de una cola con sus items."""
    result = await db.execute(
        select(CallQueue).where(CallQueue.id == queue_id)
    )
    queue = result.scalar_one_or_none()
    if not queue:
        raise HTTPException(status_code=404, detail="Cola no encontrada")

    items_result = await db.execute(
        select(CallQueueItem)
        .where(CallQueueItem.queue_id == queue_id)
        .order_by(CallQueueItem.position)
    )
    items = items_result.scalars().all()

    data = CallQueueResponse.model_validate(queue).model_dump()
    data["items"] = [CallQueueItemResponse.model_validate(i) for i in items]
    return data


@router.post("/queues", response_model=CallQueueResponse)
async def create_queue(
    data: CallQueueCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Crea una cola de llamadas batch."""
    try:
        queue = await call_queue_service.create_queue(
            db=db,
            name=data.name,
            prompt_id=data.prompt_id,
            lead_ids=data.lead_ids,
            user_id=UUID(current_user["user_id"]),
            scheduled_at=data.scheduled_at,
            concurrency_limit=data.concurrency_limit,
            delay_between_calls_s=data.delay_between_calls_s,
            max_retries=data.max_retries,
            notes=data.notes,
        )
        return CallQueueResponse.model_validate(queue)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/queues/{queue_id}", response_model=CallQueueResponse)
async def update_queue(
    queue_id: UUID,
    data: CallQueueUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Actualiza una cola (solo si está pending o paused)."""
    queue = await db.get(CallQueue, queue_id)
    if not queue:
        raise HTTPException(status_code=404, detail="Cola no encontrada")
    if queue.status not in ("pending", "paused"):
        raise HTTPException(status_code=400, detail="Solo se puede editar en estado pending/paused")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(queue, field, value)
    await db.commit()
    await db.refresh(queue)
    return CallQueueResponse.model_validate(queue)


@router.post("/queues/{queue_id}/start", response_model=CallQueueResponse)
async def start_queue(
    queue_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Inicia la ejecución de una cola."""
    try:
        queue = await call_queue_service.start_queue(db, queue_id)
        # Lanzar procesamiento en background
        import asyncio
        asyncio.create_task(call_queue_service.process_queue_items(queue_id))
        return CallQueueResponse.model_validate(queue)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/queues/{queue_id}/pause", response_model=CallQueueResponse)
async def pause_queue(
    queue_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Pausa una cola en ejecución."""
    try:
        queue = await call_queue_service.pause_queue(db, queue_id)
        return CallQueueResponse.model_validate(queue)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/queues/{queue_id}/cancel", response_model=CallQueueResponse)
async def cancel_queue(
    queue_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Cancela una cola."""
    try:
        queue = await call_queue_service.cancel_queue(db, queue_id)
        return CallQueueResponse.model_validate(queue)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/queues/{queue_id}/retry-failed")
async def retry_failed_items(
    queue_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Re-encola items fallidos de una cola."""
    try:
        result = await call_queue_service.retry_failed(db, queue_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/queues/{queue_id}")
async def delete_queue(
    queue_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Elimina una cola (solo si no está running)."""
    queue = await db.get(CallQueue, queue_id)
    if not queue:
        raise HTTPException(status_code=404, detail="Cola no encontrada")
    if queue.status == "running":
        raise HTTPException(status_code=400, detail="No se puede eliminar una cola en ejecución")

    await db.delete(queue)
    await db.commit()
    return {"detail": "Cola eliminada"}


# ─── Prompt Analytics (Fase 3) ───────────────────────────────

@router.get("/prompts/analytics")
async def prompt_analytics(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Métricas por prompt: tasa de demo, sentiment medio, duración media, coste."""
    prompts = await db.execute(select(CallPrompt).where(CallPrompt.activo == True))
    all_prompts = prompts.scalars().all()

    analytics = []
    for prompt in all_prompts:
        calls_q = await db.execute(
            select(CallRecord).where(
                CallRecord.prompt_id == prompt.id,
                CallRecord.estado == "finalizada"
            )
        )
        calls = calls_q.scalars().all()
        total = len(calls)

        if total == 0:
            analytics.append({
                "prompt_id": str(prompt.id),
                "prompt_name": prompt.nombre,
                "objetivo": prompt.objetivo,
                "total_calls": 0,
            })
            continue

        durations = [c.duracion_segundos for c in calls if c.duracion_segundos]
        sentiments = [c.sentiment_score for c in calls if c.sentiment_score is not None]
        costs = [c.coste_eur for c in calls if c.coste_eur]
        score_deltas = [c.score_despues - c.score_antes for c in calls if c.score_despues is not None and c.score_antes is not None]

        resultados = {}
        for c in calls:
            if c.resultado:
                resultados[c.resultado] = resultados.get(c.resultado, 0) + 1

        demos = resultados.get("demo_agendada", 0) + resultados.get("propuesta_solicitada", 0)

        analytics.append({
            "prompt_id": str(prompt.id),
            "prompt_name": prompt.nombre,
            "objetivo": prompt.objetivo,
            "version": prompt.version,
            "total_calls": total,
            "avg_duration_s": round(sum(durations) / len(durations), 1) if durations else 0,
            "avg_sentiment": round(sum(sentiments) / len(sentiments), 2) if sentiments else 0,
            "avg_cost_eur": round(sum(costs) / len(costs), 3) if costs else 0,
            "total_cost_eur": round(sum(costs), 2) if costs else 0,
            "avg_score_delta": round(sum(score_deltas) / len(score_deltas), 1) if score_deltas else 0,
            "conversion_rate": round(demos / total * 100, 1) if total else 0,
            "resultados": resultados,
        })

    # Sort by conversion rate descending
    analytics.sort(key=lambda x: x.get("conversion_rate", 0), reverse=True)

    return {"prompts": analytics, "total_prompts": len(analytics)}


@router.get("/prompts/compare")
async def compare_prompts(
    prompt_a: UUID = Query(...),
    prompt_b: UUID = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Compara dos prompts A/B side-by-side."""
    async def get_metrics(prompt_id):
        prompt = await db.get(CallPrompt, prompt_id)
        if not prompt:
            return None
        calls_q = await db.execute(
            select(CallRecord).where(CallRecord.prompt_id == prompt_id, CallRecord.estado == "finalizada")
        )
        calls = calls_q.scalars().all()
        total = len(calls)
        if total == 0:
            return {"prompt_name": prompt.nombre, "total_calls": 0}

        durations = [c.duracion_segundos for c in calls if c.duracion_segundos]
        sentiments = [c.sentiment_score for c in calls if c.sentiment_score is not None]
        costs = [c.coste_eur for c in calls if c.coste_eur]

        resultados = {}
        for c in calls:
            if c.resultado:
                resultados[c.resultado] = resultados.get(c.resultado, 0) + 1

        demos = resultados.get("demo_agendada", 0) + resultados.get("propuesta_solicitada", 0)
        positive = sum(1 for c in calls if c.sentiment == "positivo")

        return {
            "prompt_name": prompt.nombre,
            "objetivo": prompt.objetivo,
            "version": prompt.version,
            "total_calls": total,
            "avg_duration_s": round(sum(durations) / len(durations), 1) if durations else 0,
            "avg_sentiment": round(sum(sentiments) / len(sentiments), 2) if sentiments else 0,
            "positive_sentiment_pct": round(positive / total * 100, 1),
            "avg_cost_eur": round(sum(costs) / len(costs), 3) if costs else 0,
            "conversion_rate": round(demos / total * 100, 1),
            "resultados": resultados,
        }

    a_metrics = await get_metrics(prompt_a)
    b_metrics = await get_metrics(prompt_b)

    if not a_metrics or not b_metrics:
        raise HTTPException(status_code=404, detail="Prompt no encontrado")

    # Determine winner
    winner = None
    if a_metrics["total_calls"] > 0 and b_metrics["total_calls"] > 0:
        if a_metrics["conversion_rate"] > b_metrics["conversion_rate"]:
            winner = "A"
        elif b_metrics["conversion_rate"] > a_metrics["conversion_rate"]:
            winner = "B"

    return {"prompt_a": a_metrics, "prompt_b": b_metrics, "winner": winner}


# ─── RGPD / GDPR Consent (Fase 4) ───────────────────────────

@router.get("/rgpd/consents")
async def list_consents(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lista registros de consentimiento de grabación."""
    query = select(CallRecord).where(CallRecord.consentimiento_grabacion == True)
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar()
    query = query.order_by(desc(CallRecord.fecha_inicio)).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    calls = result.scalars().all()
    return {
        "items": [{"id": str(c.id), "lead_id": str(c.lead_id), "fecha": c.fecha_inicio.isoformat() if c.fecha_inicio else None, "consentimiento": c.consentimiento_grabacion, "tiene_transcripcion": bool(c.transcripcion)} for c in calls],
        "total": total, "page": page, "page_size": page_size,
    }


@router.post("/{call_id}/consent")
async def update_consent(
    call_id: UUID,
    consent: bool = Query(...),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Actualiza el consentimiento de grabación de una llamada."""
    call = await db.get(CallRecord, call_id)
    if not call:
        raise HTTPException(status_code=404, detail="Llamada no encontrada")
    call.consentimiento_grabacion = consent
    await db.commit()
    return {"call_id": str(call_id), "consentimiento": consent}


@router.delete("/{call_id}/recording")
async def delete_recording(
    call_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Derecho de supresión: elimina transcripción y resumen de una llamada."""
    call = await db.get(CallRecord, call_id)
    if not call:
        raise HTTPException(status_code=404, detail="Llamada no encontrada")
    call.transcripcion = None
    call.resumen_ia = None
    call.sentiment = None
    call.sentiment_score = None
    call.notas_agente = f"[RGPD] Grabación eliminada por solicitud el {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M')}"
    await db.commit()
    return {"call_id": str(call_id), "deleted": True, "message": "Transcripción y resumen eliminados"}


@router.get("/rgpd/stats")
async def rgpd_stats(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Estadísticas RGPD de llamadas."""
    total_calls = (await db.execute(select(func.count(CallRecord.id)))).scalar() or 0
    with_consent = (await db.execute(select(func.count(CallRecord.id)).where(CallRecord.consentimiento_grabacion == True))).scalar() or 0
    with_transcription = (await db.execute(select(func.count(CallRecord.id)).where(CallRecord.transcripcion.isnot(None)))).scalar() or 0
    without_consent_with_transcript = (await db.execute(select(func.count(CallRecord.id)).where(
        CallRecord.consentimiento_grabacion == False, CallRecord.transcripcion.isnot(None)
    ))).scalar() or 0

    return {
        "total_calls": total_calls,
        "with_consent": with_consent,
        "consent_rate_pct": round(with_consent / total_calls * 100, 1) if total_calls else 0,
        "with_transcription": with_transcription,
        "compliance_risk": without_consent_with_transcript,
        "compliant": without_consent_with_transcript == 0,
    }
