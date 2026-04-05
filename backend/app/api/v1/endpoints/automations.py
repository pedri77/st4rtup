from typing import Optional
from uuid import UUID
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.tenant import get_org_id
from app.models import (
    Automation, AutomationExecution,
    AutomationStatus, AutomationCategory, AutomationPriority,
    AutomationImplStatus, AutomationPhase,
)
from app.schemas import (
    AutomationCreate, AutomationUpdate, AutomationResponse, AutomationDetail,
    AutomationExecutionCreate, AutomationExecutionResponse,
    AutomationStats, PaginatedResponse,
)

router = APIRouter()


# ─── CRUD ─────────────────────────────────────────────────────────

@router.get("/", response_model=PaginatedResponse)
async def list_automations(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    category: Optional[AutomationCategory] = None,
    status: Optional[AutomationStatus] = None,
    priority: Optional[AutomationPriority] = None,
    impl_status: Optional[AutomationImplStatus] = None,
    phase: Optional[AutomationPhase] = None,
    search: Optional[str] = Query(None, max_length=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    org_id: str = Depends(get_org_id),
):
    query = select(Automation)
    query = query.where(Automation.org_id == org_id)
    if category:
        query = query.where(Automation.category == category)
    if status:
        query = query.where(Automation.status == status)
    if priority:
        query = query.where(Automation.priority == priority)
    if impl_status:
        query = query.where(Automation.impl_status == impl_status)
    if phase:
        query = query.where(Automation.phase == phase)
    if search:
        query = query.where(
            Automation.name.ilike(f"%{search}%") |
            Automation.code.ilike(f"%{search}%") |
            Automation.description.ilike(f"%{search}%")
        )

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    query = query.order_by(Automation.code.asc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    automations = result.scalars().all()

    items = []
    now = datetime.now(timezone.utc)
    t24h = now - timedelta(hours=24)

    for a in automations:
        resp = AutomationResponse.model_validate(a)
        # Get last execution
        last_exec = await db.execute(
            select(AutomationExecution)
            .where(AutomationExecution.automation_id == a.id)
            .order_by(AutomationExecution.started_at.desc())
            .limit(1)
        )
        le = last_exec.scalar_one_or_none()
        if le:
            resp.last_execution = {
                "id": str(le.id),
                "status": le.status,
                "started_at": le.started_at.isoformat() if le.started_at else None,
                "duration_ms": le.duration_ms,
                "items_processed": le.items_processed,
            }
        # 24h stats
        exec_24h = await db.execute(
            select(func.count(AutomationExecution.id))
            .where(and_(
                AutomationExecution.automation_id == a.id,
                AutomationExecution.started_at >= t24h,
            ))
        )
        resp.executions_24h = exec_24h.scalar() or 0
        # Success rate
        if resp.executions_24h > 0:
            success_24h = await db.execute(
                select(func.count(AutomationExecution.id))
                .where(and_(
                    AutomationExecution.automation_id == a.id,
                    AutomationExecution.started_at >= t24h,
                    AutomationExecution.status == "success",
                ))
            )
            resp.success_rate = round((success_24h.scalar() or 0) / resp.executions_24h * 100, 1)

        items.append(resp)

    return PaginatedResponse(
        items=items, total=total, page=page,
        page_size=page_size, pages=(total + page_size - 1) // page_size,
    )


@router.get("/stats", response_model=AutomationStats)
async def get_automation_stats(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    t24h = now - timedelta(hours=24)

    total = (await db.execute(select(func.count(Automation.id)))).scalar() or 0

    # By status
    status_q = await db.execute(
        select(Automation.status, func.count(Automation.id))
        .where(Automation.status.isnot(None))
        .group_by(Automation.status)
    )
    by_status = {str(r[0].value): r[1] for r in status_q.all()}

    # By category
    cat_q = await db.execute(
        select(Automation.category, func.count(Automation.id))
        .where(Automation.category.isnot(None))
        .group_by(Automation.category)
    )
    by_category = {str(r[0].value): r[1] for r in cat_q.all()}

    # By priority
    prio_q = await db.execute(
        select(Automation.priority, func.count(Automation.id))
        .where(Automation.priority.isnot(None))
        .group_by(Automation.priority)
    )
    by_priority = {str(r[0].value): r[1] for r in prio_q.all()}

    # By impl status
    impl_q = await db.execute(
        select(Automation.impl_status, func.count(Automation.id))
        .where(Automation.impl_status.isnot(None))
        .group_by(Automation.impl_status)
    )
    by_impl_status = {str(r[0].value): r[1] for r in impl_q.all()}

    # By phase
    phase_q = await db.execute(
        select(Automation.phase, func.count(Automation.id))
        .where(Automation.phase.isnot(None))
        .group_by(Automation.phase)
    )
    by_phase = {str(r[0].value): r[1] for r in phase_q.all()}

    active_count = by_status.get("active", 0)
    error_count = by_status.get("error", 0)

    # Executions 24h
    exec_24h = (await db.execute(
        select(func.count(AutomationExecution.id))
        .where(AutomationExecution.started_at >= t24h)
    )).scalar() or 0

    success_24h = (await db.execute(
        select(func.count(AutomationExecution.id))
        .where(and_(
            AutomationExecution.started_at >= t24h,
            AutomationExecution.status == "success",
        ))
    )).scalar() or 0

    errors_24h = (await db.execute(
        select(func.count(AutomationExecution.id))
        .where(and_(
            AutomationExecution.started_at >= t24h,
            AutomationExecution.status == "error",
        ))
    )).scalar() or 0

    overall_rate = round(success_24h / exec_24h * 100, 1) if exec_24h > 0 else 0.0

    # Hours
    hours_total = (await db.execute(
        select(func.coalesce(func.sum(Automation.estimated_hours), 0))
    )).scalar() or 0.0

    hours_completed = (await db.execute(
        select(func.coalesce(func.sum(Automation.estimated_hours), 0))
        .where(Automation.impl_status == AutomationImplStatus.DEPLOYED)
    )).scalar() or 0.0

    return AutomationStats(
        total=total,
        by_status=by_status,
        by_category=by_category,
        by_priority=by_priority,
        by_impl_status=by_impl_status,
        by_phase=by_phase,
        active_count=active_count,
        error_count=error_count,
        total_executions_24h=exec_24h,
        total_success_24h=success_24h,
        total_errors_24h=errors_24h,
        overall_success_rate=overall_rate,
        estimated_hours_total=hours_total,
        estimated_hours_completed=hours_completed,
    )


@router.get("/{automation_id}", response_model=AutomationDetail)
async def get_automation(
    automation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(select(Automation).where(Automation.id == automation_id))
    auto = result.scalar_one_or_none()
    if not auto:
        raise HTTPException(status_code=404, detail="Automation not found")
    return AutomationDetail.model_validate(auto)


@router.post("/", response_model=AutomationResponse, status_code=201)
async def create_automation(
    data: AutomationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    existing = await db.execute(select(Automation).where(Automation.code == data.code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Automation with code {data.code} already exists")
    auto = Automation(**data.model_dump())
    db.add(auto)
    await db.commit()
    await db.refresh(auto)
    return AutomationResponse.model_validate(auto)


@router.put("/{automation_id}", response_model=AutomationResponse)
async def update_automation(
    automation_id: UUID,
    data: AutomationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(select(Automation).where(Automation.id == automation_id))
    auto = result.scalar_one_or_none()
    if not auto:
        raise HTTPException(status_code=404, detail="Automation not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(auto, key, value)
    await db.commit()
    await db.refresh(auto)
    return AutomationResponse.model_validate(auto)


@router.delete("/{automation_id}", status_code=204)
async def delete_automation(
    automation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(select(Automation).where(Automation.id == automation_id))
    auto = result.scalar_one_or_none()
    if not auto:
        raise HTTPException(status_code=404, detail="Automation not found")
    await db.delete(auto)
    await db.commit()


# ─── Toggle / Control ─────────────────────────────────────────────

@router.post("/{automation_id}/toggle", response_model=AutomationResponse)
async def toggle_automation(
    automation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(select(Automation).where(Automation.id == automation_id))
    auto = result.scalar_one_or_none()
    if not auto:
        raise HTTPException(status_code=404, detail="Automation not found")
    auto.is_enabled = not auto.is_enabled
    auto.status = AutomationStatus.ACTIVE if auto.is_enabled else AutomationStatus.PAUSED
    await db.commit()
    await db.refresh(auto)
    return AutomationResponse.model_validate(auto)


# Codes with real implementation in workflow engine / scheduler
DEPLOYED_CODES = {
    "EM-01", "EM-02", "EM-03", "EM-04",
    "LD-01", "LD-02", "LD-03", "LD-04",
    "VI-01", "VI-02", "VI-03",
    "AC-01", "AC-02", "AC-03",
    "PI-01", "PI-02", "PI-03",
    "MR-01", "MR-02",
    "SV-01", "SV-02",
    "IN-01", "IN-02",
    "RS-033", "RS-045b", "RS-045c",
    "RS-054b", "RS-054c", "RS-092", "RS-093", "RS-094",
}


@router.post("/activate-deployed")
async def activate_deployed_automations(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Activa todas las automatizaciones que tienen implementación real desplegada."""
    result = await db.execute(
        select(Automation).where(Automation.code.in_(DEPLOYED_CODES))
    )
    automations = result.scalars().all()
    activated = 0
    for auto in automations:
        if not auto.is_enabled or auto.status != AutomationStatus.ACTIVE:
            auto.is_enabled = True
            auto.status = AutomationStatus.ACTIVE
            auto.impl_status = AutomationImplStatus.DEPLOYED
            activated += 1
    await db.commit()
    return {
        "activated": activated,
        "total_deployed": len(automations),
        "codes": list(DEPLOYED_CODES),
    }


# ─── Executions ───────────────────────────────────────────────────

@router.get("/{automation_id}/executions", response_model=list[AutomationExecutionResponse])
async def list_executions(
    automation_id: UUID,
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(
        select(AutomationExecution)
        .where(AutomationExecution.automation_id == automation_id)
        .order_by(AutomationExecution.started_at.desc())
        .limit(limit)
    )
    return [AutomationExecutionResponse.model_validate(e) for e in result.scalars().all()]


@router.post("/executions", response_model=AutomationExecutionResponse, status_code=201)
async def create_execution(
    data: AutomationExecutionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    execution = AutomationExecution(**data.model_dump())
    db.add(execution)
    await db.commit()
    await db.refresh(execution)
    return AutomationExecutionResponse.model_validate(execution)


# ─── Flow Diagram ────────────────────────────────────────────────

@router.get("/{automation_id}/flow")
async def automation_flow(
    automation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Flow diagram data: trigger → actions for an automation."""
    auto = await db.get(Automation, automation_id)
    if not auto:
        raise HTTPException(status_code=404, detail="Automation not found")

    nodes = []
    links = []

    # Trigger node
    nodes.append({
        "id": "trigger",
        "label": auto.trigger_type.value if auto.trigger_type else "manual",
        "type": "trigger",
        "detail": str(auto.trigger_config or {})[:100],
    })

    # Parse actions from actions_description
    actions_text = auto.actions_description or ""
    steps = [
        line.strip().lstrip("0123456789.").strip()
        for line in actions_text.split("\n")
        if line.strip() and line.strip()[0].isdigit()
    ]

    prev_id = "trigger"
    for i, step in enumerate(steps):
        node_id = f"step_{i}"
        nodes.append({"id": node_id, "label": step[:60], "type": "action"})
        links.append({"source": prev_id, "target": node_id})
        prev_id = node_id

    # Result node
    nodes.append({"id": "result", "label": "Completado", "type": "result"})
    links.append({"source": prev_id, "target": "result"})

    return {"automation": auto.name, "code": auto.code, "nodes": nodes, "links": links}


# ─── Seed ─────────────────────────────────────────────────────────

@router.post("/seed", response_model=dict)
async def seed_automations(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Seed all 22 automations from the master plan."""
    existing = (await db.execute(select(func.count(Automation.id)))).scalar()
    if existing > 0:
        return {"message": f"Already {existing} automations exist. Delete first to re-seed.", "seeded": 0}

    seed_data = [
        {"code": "EM-01", "name": "Secuencia Welcome", "description": "Cuando se crea un lead nuevo, dispara secuencia de 3 emails automáticos: Día 0 (intro), Día 3 (propuesta valor), Día 7 (follow-up).", "category": "email_automation", "trigger_type": "webhook", "trigger_config": {"webhook_path": "/hooks/lead-created", "event": "lead.created"}, "actions_description": "1. Recibir webhook nuevo lead\n2. Wait 0/3/7 días\n3. GET template por categoría\n4. Personalizar con datos lead\n5. POST /emails (crear)\n6. POST /emails/{id}/send\n7. PUT /leads/{id} (status→contacted)", "api_endpoints": ["POST /api/v1/emails", "POST /api/v1/emails/{id}/send", "PUT /api/v1/leads/{id}"], "integrations": ["Resend API"], "priority": "critical", "complexity": "medium", "impact": "Alto - Primer contacto automático", "phase": "phase_1", "sprint": "Sprint 2", "estimated_hours": 8, "dependencies": []},
        {"code": "EM-02", "name": "Tracking de Email", "description": "Webhook de Resend notifica cuando un email es abierto, clickeado o respondido. Actualiza status y ajusta score del lead (+5 open, +10 click, +20 reply).", "category": "email_automation", "trigger_type": "webhook", "trigger_config": {"webhook_path": "/hooks/resend-events", "events": ["email.opened", "email.clicked", "email.replied"]}, "actions_description": "1. Recibir webhook Resend\n2. Buscar email por resend_id\n3. PUT /emails/{id}\n4. GET lead asociado\n5. PUT /leads/{id} (score)\n6. Si reply → crear Action follow-up", "api_endpoints": ["PUT /api/v1/emails/{id}", "PUT /api/v1/leads/{id}", "POST /api/v1/actions"], "integrations": ["Resend Webhooks"], "priority": "critical", "complexity": "low", "impact": "Alto - Scoring automático", "phase": "phase_1", "sprint": "Sprint 2", "estimated_hours": 4, "dependencies": ["EM-01"]},
        {"code": "EM-03", "name": "Re-engagement Automático", "description": "Cron semanal busca leads dormant con último contacto > 30 días. Envía email de reactivación personalizado según sector y frameworks.", "category": "email_automation", "trigger_type": "cron", "trigger_config": {"cron": "0 9 * * 1", "timezone": "Europe/Madrid"}, "actions_description": "1. GET /leads?status=dormant\n2. Filtrar último contacto > 30d\n3. Seleccionar template por sector\n4. POST /emails + send\n5. PUT /leads/{id} (status→contacted)", "api_endpoints": ["GET /api/v1/leads", "POST /api/v1/emails", "PUT /api/v1/leads/{id}"], "integrations": ["Resend API"], "priority": "high", "complexity": "medium", "impact": "Alto - Recuperar oportunidades", "phase": "phase_4", "sprint": "Sprint 7", "estimated_hours": 4, "dependencies": ["EM-01"]},
        {"code": "EM-04", "name": "Follow-up Post-Visita", "description": "Tras visita positiva o follow_up, envía email de agradecimiento y resumen 24h después con los next_steps acordados.", "category": "email_automation", "trigger_type": "webhook", "trigger_config": {"webhook_path": "/hooks/visit-created", "filter": "result in [positive, follow_up]"}, "actions_description": "1. Recibir webhook nueva visita\n2. Filtrar result\n3. Wait 24h\n4. GET /leads/{id}\n5. Componer email con summary + next_steps\n6. POST /emails + send", "api_endpoints": ["GET /api/v1/leads/{id}", "POST /api/v1/emails", "POST /api/v1/emails/{id}/send"], "integrations": ["Resend API"], "priority": "high", "complexity": "low", "impact": "Alto - Profesionalizar seguimiento", "phase": "phase_2", "sprint": "Sprint 3", "estimated_hours": 3, "dependencies": []},
        {"code": "LD-01", "name": "Webhook Formulario Web", "description": "Recibe datos de formulario st4rtup.app, crea lead con source=website, asigna score inicial y notifica por Telegram.", "category": "leads_captacion", "trigger_type": "webhook", "trigger_config": {"webhook_path": "/hooks/website-form"}, "actions_description": "1. Recibir datos formulario\n2. Mapear campos a schema Lead\n3. POST /leads\n4. Calcular score inicial\n5. PUT /leads/{id}\n6. Notificar Telegram", "api_endpoints": ["POST /api/v1/leads", "PUT /api/v1/leads/{id}"], "integrations": ["Telegram Bot API"], "priority": "critical", "complexity": "low", "impact": "Crítico - No perder ningún lead", "phase": "phase_1", "sprint": "Sprint 1", "estimated_hours": 4, "dependencies": []},
        {"code": "LD-02", "name": "Sincronización Apollo.io", "description": "Cron diario sincroniza prospectos desde Apollo.io filtrados por sector, país España y tamaño > 50 empleados.", "category": "leads_captacion", "trigger_type": "cron", "trigger_config": {"cron": "0 8 * * *", "timezone": "Europe/Madrid"}, "actions_description": "1. GET Apollo.io API\n2. Filtrar criterios\n3. Verificar duplicados (CIF)\n4. POST /leads enriquecidos\n5. Resumen diario email", "api_endpoints": ["POST /api/v1/leads", "GET /api/v1/leads"], "integrations": ["Apollo.io API"], "priority": "high", "complexity": "high", "impact": "Alto - Alimentar pipeline", "phase": "phase_3", "sprint": "Sprint 6", "estimated_hours": 8, "dependencies": []},
        {"code": "LD-03", "name": "Enriquecimiento Automático", "description": "Lead con datos mínimos → busca CIF, sector CNAE, tamaño, contactos. Infiere frameworks regulatorios aplicables.", "category": "leads_captacion", "trigger_type": "webhook", "trigger_config": {"webhook_path": "/hooks/lead-created", "filter": "minimal_data"}, "actions_description": "1. Detectar lead incompleto\n2. Buscar API CNAE\n3. Apollo.io enrichment\n4. Inferir frameworks\n5. PUT /leads/{id}", "api_endpoints": ["PUT /api/v1/leads/{id}"], "integrations": ["Apollo.io API", "APIs CNAE"], "priority": "medium", "complexity": "high", "impact": "Medio - Mejor cualificación", "phase": "phase_3", "sprint": "Sprint 6", "estimated_hours": 6, "dependencies": ["LD-02"]},
        {"code": "LD-04", "name": "Lead Scoring Automático", "description": "Recalcula score basado en reglas: sector crítico +20, público +15, >200 empleados +10, NIS2 +25, interacción email +5/+10/+20.", "category": "leads_captacion", "trigger_type": "event", "trigger_config": {"events": ["lead.updated", "email.opened", "visit.created"]}, "actions_description": "1. Recibir evento\n2. GET /leads/{id}\n3. Aplicar reglas scoring\n4. PUT /leads/{id}\n5. Si score > 70 → qualified\n6. Notificar", "api_endpoints": ["GET /api/v1/leads/{id}", "PUT /api/v1/leads/{id}"], "integrations": ["Telegram Bot API"], "priority": "high", "complexity": "medium", "impact": "Alto - Priorizar esfuerzo", "phase": "phase_1", "sprint": "Sprint 2", "estimated_hours": 4, "dependencies": ["EM-02"]},
        {"code": "VI-01", "name": "Auto-crear Acciones Post-Visita", "description": "Al registrar visita, crea acciones automáticas según resultado: positive → propuesta (3d), follow_up → reunión (5d).", "category": "visitas", "trigger_type": "webhook", "trigger_config": {"webhook_path": "/hooks/visit-created"}, "actions_description": "1. Recibir visita\n2. Switch por result\n3. POST /actions\n4. PUT /leads/{id}", "api_endpoints": ["POST /api/v1/actions", "PUT /api/v1/leads/{id}"], "integrations": [], "priority": "high", "complexity": "low", "impact": "Alto - No olvidar next steps", "phase": "phase_2", "sprint": "Sprint 3", "estimated_hours": 3, "dependencies": []},
        {"code": "VI-02", "name": "Recordatorio Pre-Visita", "description": "24h antes de visita programada, envía briefing con datos del lead, historial y puntos clave.", "category": "visitas", "trigger_type": "cron", "trigger_config": {"cron": "0 * * * *", "timezone": "Europe/Madrid"}, "actions_description": "1. GET /visits próximas 24h\n2. GET /leads/{id}\n3. GET historial\n4. Componer briefing\n5. Enviar Telegram + Email", "api_endpoints": ["GET /api/v1/visits", "GET /api/v1/leads/{id}", "GET /api/v1/emails"], "integrations": ["Telegram Bot API", "Google Calendar"], "priority": "medium", "complexity": "medium", "impact": "Medio - Mejor preparación", "phase": "phase_4", "sprint": "Sprint 8", "estimated_hours": 4, "dependencies": []},
        {"code": "VI-03", "name": "Sync Google Calendar", "description": "Sincronización bidireccional con Google Calendar para visitas comerciales.", "category": "visitas", "trigger_type": "webhook", "trigger_config": {"bidirectional": True}, "actions_description": "1A. Nueva visita → evento GCal\n1B. Evento GCal → POST /visits\n2. Actualizar ambos\n3. Link a lead en descripción", "api_endpoints": ["POST /api/v1/visits", "GET /api/v1/leads/{id}"], "integrations": ["Google Calendar API"], "priority": "medium", "complexity": "high", "impact": "Medio - Centralizar agenda", "phase": "phase_4", "sprint": "Sprint 8", "estimated_hours": 6, "dependencies": []},
        {"code": "AC-01", "name": "Resumen Diario de Acciones", "description": "Cada día 08:30 envía resumen Telegram + email: acciones vencidas, hoy, próximos 3 días, priorizado por urgencia.", "category": "acciones_alertas", "trigger_type": "cron", "trigger_config": {"cron": "30 8 * * *", "timezone": "Europe/Madrid"}, "actions_description": "1. GET /actions pending + in_progress\n2. Clasificar: overdue/hoy/3d\n3. GET /leads para nombres\n4. Componer mensaje\n5. Enviar Telegram + Email", "api_endpoints": ["GET /api/v1/actions", "GET /api/v1/leads/{id}"], "integrations": ["Telegram Bot API", "Resend API"], "priority": "critical", "complexity": "low", "impact": "Crítico - No perder oportunidades", "phase": "phase_1", "sprint": "Sprint 1", "estimated_hours": 4, "dependencies": []},
        {"code": "AC-02", "name": "Escalado Automático", "description": "Acciones overdue > 3d → alerta Telegram. Overdue > 7d → prioridad critical + email escalado.", "category": "acciones_alertas", "trigger_type": "cron", "trigger_config": {"cron": "0 9 * * *", "timezone": "Europe/Madrid"}, "actions_description": "1. GET /actions overdue\n2. Calcular días retraso\n3. Si > 3d → Telegram\n4. Si > 7d → PUT priority critical + email", "api_endpoints": ["GET /api/v1/actions", "PUT /api/v1/actions/{id}", "GET /api/v1/leads/{id}"], "integrations": ["Telegram Bot API", "Resend API"], "priority": "high", "complexity": "low", "impact": "Alto - Evitar caída de deals", "phase": "phase_2", "sprint": "Sprint 3", "estimated_hours": 3, "dependencies": ["AC-01"]},
        {"code": "AC-03", "name": "Auto-cierre Acciones", "description": "Al enviar email o registrar visita, marca acciones pendientes relacionadas como completadas automáticamente.", "category": "acciones_alertas", "trigger_type": "event", "trigger_config": {"events": ["email.sent", "visit.created"]}, "actions_description": "1. Recibir evento\n2. GET /actions?lead_id&pending\n3. Match por type\n4. PUT /actions completed", "api_endpoints": ["GET /api/v1/actions", "PUT /api/v1/actions/{id}"], "integrations": [], "priority": "medium", "complexity": "medium", "impact": "Medio - Reducir gestión manual", "phase": "phase_4", "sprint": "Sprint 8", "estimated_hours": 4, "dependencies": []},
        {"code": "PI-01", "name": "Triggers por Cambio de Etapa", "description": "Cambio de stage en oportunidad dispara acciones: qualification→checklist, proposal→email, negotiation→alerta, closed_won→encuesta.", "category": "pipeline", "trigger_type": "webhook", "trigger_config": {"webhook_path": "/hooks/opportunity-stage-change"}, "actions_description": "1. Detectar cambio stage\n2. Switch por etapa\n3. Crear acciones/emails/surveys\n4. Actualizar lead status", "api_endpoints": ["PUT /api/v1/leads/{id}", "POST /api/v1/actions", "POST /api/v1/emails", "POST /api/v1/surveys"], "integrations": ["Telegram Bot API", "Resend API"], "priority": "high", "complexity": "high", "impact": "Crítico - Automatizar proceso", "phase": "phase_2", "sprint": "Sprint 4", "estimated_hours": 8, "dependencies": ["EM-01", "AC-01"]},
        {"code": "PI-02", "name": "Report Semanal Pipeline", "description": "Viernes 17:00: informe con valor pipeline, ponderado, oportunidades por etapa, deals en riesgo, forecast.", "category": "pipeline", "trigger_type": "cron", "trigger_config": {"cron": "0 17 * * 5", "timezone": "Europe/Madrid"}, "actions_description": "1. GET /dashboard/stats\n2. GET /opportunities\n3. Calcular deals sin actividad\n4. Generar informe HTML\n5. Enviar email + Telegram", "api_endpoints": ["GET /api/v1/dashboard/stats", "GET /api/v1/opportunities", "GET /api/v1/actions"], "integrations": ["Telegram Bot API", "Resend API"], "priority": "high", "complexity": "medium", "impact": "Alto - Visibilidad del negocio", "phase": "phase_2", "sprint": "Sprint 4", "estimated_hours": 4, "dependencies": []},
        {"code": "PI-03", "name": "Alerta Deal Estancado", "description": "Detecta oportunidades sin actividad en 14 días. Crea acción follow-up y alerta Telegram.", "category": "pipeline", "trigger_type": "cron", "trigger_config": {"cron": "0 10 * * 3", "timezone": "Europe/Madrid"}, "actions_description": "1. GET /opportunities abiertas\n2. Verificar última actividad\n3. Si > 14d → POST /actions + alerta", "api_endpoints": ["GET /api/v1/opportunities", "GET /api/v1/actions", "POST /api/v1/actions"], "integrations": ["Telegram Bot API"], "priority": "high", "complexity": "medium", "impact": "Alto - Reactivar deals", "phase": "phase_2", "sprint": "Sprint 4", "estimated_hours": 4, "dependencies": []},
        {"code": "MR-01", "name": "Auto-generación Monthly Review", "description": "Día 1 cada mes: genera Monthly Review por lead activo con emails, visitas, acciones pre-rellenados.", "category": "seguimiento_mensual", "trigger_type": "cron", "trigger_config": {"cron": "0 8 1 * *", "timezone": "Europe/Madrid"}, "actions_description": "1. GET /leads activos\n2. Contar métricas mes anterior\n3. POST /monthly-reviews\n4. Enviar resumen consolidado", "api_endpoints": ["GET /api/v1/leads", "GET /api/v1/emails", "GET /api/v1/visits", "GET /api/v1/actions", "POST /api/v1/monthly-reviews"], "integrations": ["Resend API"], "priority": "critical", "complexity": "high", "impact": "Crítico - Ahorro tiempo", "phase": "phase_3", "sprint": "Sprint 5", "estimated_hours": 8, "dependencies": []},
        {"code": "MR-02", "name": "Informe Mensual Consolidado", "description": "Día 2 cada mes: informe HTML con KPIs, leads nuevos, oportunidades, NPS, comparativa mes anterior.", "category": "seguimiento_mensual", "trigger_type": "cron", "trigger_config": {"cron": "0 10 2 * *", "timezone": "Europe/Madrid"}, "actions_description": "1. GET /dashboard/stats\n2. GET /monthly-reviews\n3. Calcular KPIs\n4. Generar HTML\n5. Enviar email", "api_endpoints": ["GET /api/v1/dashboard/stats", "GET /api/v1/monthly-reviews", "GET /api/v1/opportunities"], "integrations": ["Resend API"], "priority": "high", "complexity": "high", "impact": "Alto - Visión ejecutiva", "phase": "phase_3", "sprint": "Sprint 5", "estimated_hours": 6, "dependencies": ["MR-01"]},
        {"code": "SV-01", "name": "Encuesta Post-Cierre (NPS)", "description": "30 días después de closed_won, envía encuesta NPS. Si NPS < 7 → acción urgente. Si NPS >= 9 → pedir referencia.", "category": "encuestas", "trigger_type": "cron", "trigger_config": {"cron": "0 10 * * *", "timezone": "Europe/Madrid"}, "actions_description": "1. GET /opportunities closed_won hace 30d\n2. POST /surveys NPS\n3. POST /emails encuesta\n4. Webhook respuesta\n5. Lógica NPS", "api_endpoints": ["POST /api/v1/surveys", "POST /api/v1/emails", "PUT /api/v1/surveys/{id}", "POST /api/v1/actions"], "integrations": ["Resend API", "Typeform"], "priority": "high", "complexity": "high", "impact": "Alto - Retención y referencias", "phase": "phase_4", "sprint": "Sprint 7", "estimated_hours": 6, "dependencies": []},
        {"code": "SV-02", "name": "Encuesta Trimestral CSAT", "description": "Cada trimestre envía encuesta de satisfacción a clientes activos. Recopila feedback e identifica mejoras.", "category": "encuestas", "trigger_type": "cron", "trigger_config": {"cron": "0 10 1 1,4,7,10 *", "timezone": "Europe/Madrid"}, "actions_description": "1. GET /leads?status=won\n2. POST /surveys CSAT\n3. POST /emails\n4. Webhook respuestas\n5. Informe trimestral", "api_endpoints": ["GET /api/v1/leads", "POST /api/v1/surveys", "POST /api/v1/emails"], "integrations": ["Resend API", "Typeform"], "priority": "medium", "complexity": "medium", "impact": "Medio - Mejora continua", "phase": "phase_4", "sprint": "Sprint 7", "estimated_hours": 4, "dependencies": ["SV-01"]},
        {"code": "IN-01", "name": "Importar Leads desde Scraping", "description": "Conecta con sistema de scraping de directorios españoles. Importa, deduplica por CIF, asigna source=scraping.", "category": "integraciones", "trigger_type": "webhook", "trigger_config": {"webhook_path": "/hooks/scraping-batch"}, "actions_description": "1. Recibir datos scraping\n2. Verificar duplicados\n3. POST /leads\n4. Asignar frameworks\n5. Resumen Telegram", "api_endpoints": ["POST /api/v1/leads", "GET /api/v1/leads"], "integrations": ["Sistema scraping", "Telegram"], "priority": "high", "complexity": "medium", "impact": "Alto - Alimentar pipeline", "phase": "phase_3", "sprint": "Sprint 6", "estimated_hours": 4, "dependencies": []},
        {"code": "IN-02", "name": "Notificaciones Telegram Hub", "description": "Bot Telegram centralizado para todas las notificaciones: leads, emails, acciones, deals. Comandos rápidos.", "category": "integraciones", "trigger_type": "event", "trigger_config": {"channels": ["leads", "actions", "pipeline", "daily"]}, "actions_description": "1. Configurar Bot\n2. Crear canales\n3. Centralizar alertas\n4. Comandos: /lead, /actions today", "api_endpoints": ["GET (todos los endpoints)"], "integrations": ["Telegram Bot API"], "priority": "high", "complexity": "medium", "impact": "Alto - Centro notificaciones", "phase": "phase_1", "sprint": "Sprint 1", "estimated_hours": 4, "dependencies": []},
    ]

    count = 0
    for item in seed_data:
        auto = Automation(**item)
        # Mark deployed automations as active
        if item["code"] in DEPLOYED_CODES:
            auto.is_enabled = True
            auto.status = AutomationStatus.ACTIVE
            auto.impl_status = AutomationImplStatus.DEPLOYED
        db.add(auto)
        count += 1

    await db.commit()
    return {"message": f"Seeded {count} automations successfully", "seeded": count}
