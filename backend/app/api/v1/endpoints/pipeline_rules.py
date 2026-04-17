"""Pipeline automation rules — CRUD + execution engine."""
import logging
from typing import Optional
from uuid import UUID
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, update

from app.core.database import get_db
from app.core.tenant import get_org_id
from app.core.security import get_current_user
from app.core.permissions import require_write_access
from app.models.pipeline_rule import PipelineRule

logger = logging.getLogger(__name__)

router = APIRouter()


class RuleCreate(BaseModel):
    name: str
    description: str = ""
    trigger_stage: str
    trigger_condition: str = "enters"
    conditions: dict = {}
    actions: list = []
    priority: int = 0


class RuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    trigger_stage: Optional[str] = None
    trigger_condition: Optional[str] = None
    conditions: Optional[dict] = None
    actions: Optional[list] = None
    priority: Optional[int] = None


@router.get("/")
async def list_rules(
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
org_id: str = Depends(get_org_id),
):
    """Lista todas las reglas de pipeline."""
    result = await db.execute(
        select(PipelineRule).where(PipelineRule.org_id == org_id).order_by(PipelineRule.priority.desc(), PipelineRule.created_at)
    )
    rules = result.scalars().all()
    return {
        "rules": [
            {
                "id": str(r.id), "name": r.name, "description": r.description,
                "is_active": r.is_active, "priority": r.priority,
                "trigger_stage": r.trigger_stage, "trigger_condition": r.trigger_condition,
                "conditions": r.conditions or {}, "actions": r.actions or [],
                "times_triggered": r.times_triggered or 0,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rules
        ],
        "total": len(rules),
    }


@router.post("/", status_code=201)
async def create_rule(
    data: RuleCreate,
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_write_access),
org_id: str = Depends(get_org_id),
):
    """Crea una regla de automatizacion de pipeline."""
    rule = PipelineRule(
        name=data.name, description=data.description,
        trigger_stage=data.trigger_stage, trigger_condition=data.trigger_condition,
        conditions=data.conditions, actions=data.actions, priority=data.priority,
    )
    db.add(rule)
    await db.commit()
    return {"created": True, "id": str(rule.id)}


@router.put("/{rule_id}")
async def update_rule(
    rule_id: UUID,
    data: RuleUpdate,
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_write_access),
org_id: str = Depends(get_org_id),
):
    """Actualiza una regla."""
    result = await db.execute(select(PipelineRule).where(PipelineRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Regla no encontrada")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(rule, field, value)
    await db.commit()
    return {"updated": True}


@router.delete("/{rule_id}", status_code=204)
async def delete_rule(
    rule_id: UUID,
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_write_access),
org_id: str = Depends(get_org_id),
):
    """Elimina una regla."""
    result = await db.execute(select(PipelineRule).where(PipelineRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(status_code=404, detail="Regla no encontrada")
    await db.delete(rule)
    await db.commit()


@router.post("/seed-defaults")
async def seed_default_rules(
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_write_access),
org_id: str = Depends(get_org_id),
):
    """Carga reglas de pipeline por defecto."""
    from sqlalchemy import func
    existing = (await db.execute(select(func.count(PipelineRule.id)))).scalar() or 0
    if existing > 0:
        return {"seeded": 0, "message": f"Ya hay {existing} reglas"}

    defaults = [
        {
            "name": "Qualification → Crear accion de propuesta",
            "trigger_stage": "qualification", "trigger_condition": "enters",
            "actions": [
                {"type": "create_action", "config": {"description": "Preparar propuesta comercial", "priority": "high", "due_days": 3}},
                {"type": "notify", "config": {"message": "Lead cualificado — preparar propuesta"}},
            ],
            "priority": 10,
        },
        {
            "name": "Proposal → Enviar email de seguimiento",
            "trigger_stage": "proposal", "trigger_condition": "enters",
            "actions": [
                {"type": "create_action", "config": {"description": "Follow-up propuesta en 48h", "priority": "medium", "due_days": 2}},
            ],
            "priority": 8,
        },
        {
            "name": "Negotiation → Alerta deal critico",
            "trigger_stage": "negotiation", "trigger_condition": "enters",
            "conditions": {"min_value": 20000},
            "actions": [
                {"type": "notify", "config": {"message": "Deal >20K en negociacion — atencion prioritaria", "channel": "telegram"}},
                {"type": "create_action", "config": {"description": "Revisar condiciones comerciales con director", "priority": "critical", "due_days": 1}},
            ],
            "priority": 15,
        },
        {
            "name": "Closed Won → Celebrar + crear onboarding",
            "trigger_stage": "closed_won", "trigger_condition": "enters",
            "actions": [
                {"type": "notify", "config": {"message": "Deal GANADO — felicidades!", "channel": "telegram"}},
                {"type": "create_action", "config": {"description": "Iniciar onboarding del cliente", "priority": "critical", "due_days": 1}},
                {"type": "update_field", "config": {"field": "status", "value": "won"}},
            ],
            "priority": 20,
        },
        {
            "name": "Closed Lost → Analisis post-mortem",
            "trigger_stage": "closed_lost", "trigger_condition": "enters",
            "actions": [
                {"type": "create_action", "config": {"description": "Analisis post-mortem: por que se perdio", "priority": "low", "due_days": 7}},
                {"type": "update_field", "config": {"field": "status", "value": "lost"}},
            ],
            "priority": 5,
        },
    ]

    for d in defaults:
        db.add(PipelineRule(**d))
    await db.commit()
    return {"seeded": len(defaults)}


# ═══════════════════════════════════════════════════════════════
# Rule Execution Engine
# ═══════════════════════════════════════════════════════════════


async def execute_rules_for_stage_change(
    db: AsyncSession,
    opportunity_id: UUID,
    new_stage: str,
    old_stage: str = None,
):
    """Ejecuta todas las reglas activas que matchean el cambio de stage.

    Called from the opportunity update endpoint when stage changes.
    """
    from app.models.pipeline import Opportunity
    from app.models.lead import Lead
    from app.models.crm import Action

    # Get opportunity
    opp = (await db.execute(
        select(Opportunity).where(Opportunity.id == opportunity_id)
    )).scalar_one_or_none()
    if not opp:
        return

    # Get matching rules
    rules = (await db.execute(
        select(PipelineRule).where(
            PipelineRule.is_active == True,
            PipelineRule.trigger_stage == new_stage,
        ).order_by(PipelineRule.priority.desc())
    )).scalars().all()

    executed = 0
    for rule in rules:
        # Check trigger condition
        if rule.trigger_condition == "enters" and old_stage == new_stage:
            continue
        if rule.trigger_condition == "leaves" and new_stage != old_stage:
            continue  # 'leaves' triggers on the OLD stage

        # Check conditions
        conditions = rule.conditions or {}
        if conditions.get("min_value") and (opp.value or 0) < conditions["min_value"]:
            continue
        if conditions.get("max_value") and (opp.value or 0) > conditions["max_value"]:
            continue

        # Execute actions
        for action in (rule.actions or []):
            try:
                await _execute_action(db, action, opp)
            except Exception as e:
                logger.warning("Rule %s action failed: %s", rule.name, e)

        # Update trigger count
        rule.times_triggered = (rule.times_triggered or 0) + 1
        executed += 1

    if executed:
        await db.commit()
        logger.info("Executed %d pipeline rules for opportunity %s → %s", executed, opportunity_id, new_stage)


async def _execute_action(db: AsyncSession, action: dict, opp):
    """Ejecuta una accion individual de una regla."""
    action_type = action.get("type", "")
    config = action.get("config", {})

    if action_type == "create_action":
        from app.models.crm import Action
        import uuid
        from datetime import timedelta
        due_days = config.get("due_days", 3)
        new_action = Action(
            id=uuid.uuid4(),
            lead_id=opp.lead_id,
            description=config.get("description", "Accion automatica"),
            priority=config.get("priority", "medium"),
            status="pending",
            due_date=datetime.now(timezone.utc) + timedelta(days=due_days),
        )
        db.add(new_action)

    elif action_type == "notify":
        message = config.get("message", "Pipeline automation triggered")
        channel = config.get("channel", "internal")
        if channel == "telegram":
            try:
                from app.services.telegram_service import send_message
                company = ""
                if opp.lead_id:
                    from app.models.lead import Lead
                    lead = (await db.execute(select(Lead.company_name).where(Lead.id == opp.lead_id))).scalar()
                    company = lead or ""
                await send_message(
                    f"<b>Pipeline Automation</b>\n\n{message}\n\nDeal: {company}\nValor: {float(opp.value or 0):,.0f} EUR",
                    parse_mode="HTML",
                )
            except Exception as e:
                logger.debug("Telegram notify failed: %s", e)

    elif action_type == "update_field":
        field = config.get("field")
        value = config.get("value")
        if field and hasattr(opp, field):
            # For lead status updates
            if field == "status" and opp.lead_id:
                from app.models.lead import Lead
                await db.execute(
                    update(Lead).where(Lead.id == opp.lead_id).values(**{field: value})
                )

    elif action_type == "score":
        if opp.lead_id:
            try:
                from app.agents.deal_scorer import score_deal
                await score_deal(db, opp.id)
            except Exception as e:
                logger.debug("Auto-score failed: %s", e)
