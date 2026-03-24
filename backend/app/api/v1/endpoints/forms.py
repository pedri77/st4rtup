"""CRUD endpoints for operational forms: BANT, Partners, Onboarding, Churn, ROI."""
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel as PydanticModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.permissions import require_write_access
from app.models.forms import LeadBANT, Partner, OnboardingChecklist, ChurnRecord, ROICalculation

router = APIRouter()


# ═══════════════════════════════════════════════════════════════
# BANT Qualification
# ═══════════════════════════════════════════════════════════════

class BANTCreate(PydanticModel):
    lead_id: str
    qualification_date: Optional[str] = None
    has_budget: Optional[str] = None
    budget_range: Optional[str] = None
    budget_approver: Optional[str] = None
    budget_approval_period: Optional[str] = None
    budget_notes: Optional[str] = None
    score_budget: int = 0
    is_contact_decision_maker: Optional[str] = None
    decision_maker_name: Optional[str] = None
    decision_maker_title: Optional[str] = None
    contacted_decision_maker: Optional[str] = None
    stakeholder_map: Optional[str] = None
    score_authority: int = 0
    pain_point: Optional[str] = None
    regulatory_urgency: Optional[str] = None
    current_situation: Optional[str] = None
    desired_situation: Optional[str] = None
    competitors_evaluated: Optional[str] = None
    score_need: int = 0
    has_implementation_deadline: Optional[str] = None
    regulatory_deadline: Optional[str] = None
    decision_timeframe: Optional[str] = None
    buying_phase: Optional[str] = None
    next_milestone: Optional[str] = None
    score_timeline: int = 0
    recommendation: Optional[str] = None
    notes: Optional[str] = None


@router.get("/bant/{lead_id}")
async def get_bant(lead_id: UUID, db: AsyncSession = Depends(get_db), _: dict = Depends(get_current_user)):
    result = await db.execute(select(LeadBANT).where(LeadBANT.lead_id == lead_id).order_by(desc(LeadBANT.created_at)).limit(1))
    bant = result.scalar_one_or_none()
    if not bant:
        return {"exists": False}
    return {c.name: getattr(bant, c.name) for c in bant.__table__.columns}


@router.post("/bant")
async def create_bant(data: BANTCreate, db: AsyncSession = Depends(get_db), _: dict = Depends(require_write_access)):
    total = data.score_budget + data.score_authority + data.score_need + data.score_timeline
    bant = LeadBANT(**data.model_dump(), score_total=total)
    db.add(bant)
    await db.commit()
    return {"created": True, "id": str(bant.id), "score_total": total}


# ═══════════════════════════════════════════════════════════════
# Partners
# ═══════════════════════════════════════════════════════════════

class PartnerCreate(PydanticModel):
    name: str
    partner_type: str
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    agreement_type: Optional[str] = None
    commission_pct: float = 0
    territory: Optional[str] = None
    notes: Optional[str] = None


@router.get("/partners")
async def list_partners(db: AsyncSession = Depends(get_db), _: dict = Depends(get_current_user)):
    result = await db.execute(select(Partner).order_by(desc(Partner.created_at)))
    return [
        {c.name: getattr(p, c.name) for c in p.__table__.columns}
        for p in result.scalars().all()
    ]


@router.post("/partners")
async def create_partner(data: PartnerCreate, db: AsyncSession = Depends(get_db), _: dict = Depends(require_write_access)):
    partner = Partner(**data.model_dump())
    db.add(partner)
    await db.commit()
    return {"created": True, "id": str(partner.id)}


@router.put("/partners/{partner_id}")
async def update_partner(partner_id: UUID, data: PartnerCreate, db: AsyncSession = Depends(get_db), _: dict = Depends(require_write_access)):
    result = await db.execute(select(Partner).where(Partner.id == partner_id))
    partner = result.scalar_one_or_none()
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(partner, k, v)
    await db.commit()
    return {"updated": True}


@router.delete("/partners/{partner_id}", status_code=204)
async def delete_partner(partner_id: UUID, db: AsyncSession = Depends(get_db), _: dict = Depends(require_write_access)):
    result = await db.execute(select(Partner).where(Partner.id == partner_id))
    partner = result.scalar_one_or_none()
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    await db.delete(partner)
    await db.commit()


# ═══════════════════════════════════════════════════════════════
# Onboarding
# ═══════════════════════════════════════════════════════════════

class OnboardingCreate(PydanticModel):
    client_name: str
    lead_id: Optional[str] = None
    opportunity_id: Optional[str] = None
    start_date: Optional[str] = None
    csm_assigned: Optional[str] = None
    checklist_items: list = []
    notes: Optional[str] = None


class OnboardingUpdate(PydanticModel):
    status: Optional[str] = None
    kickoff_date: Optional[str] = None
    kickoff_completed: Optional[bool] = None
    access_provisioned: Optional[bool] = None
    data_migration_done: Optional[bool] = None
    training_scheduled: Optional[bool] = None
    training_completed: Optional[bool] = None
    go_live_date: Optional[str] = None
    go_live_completed: Optional[bool] = None
    checklist_items: Optional[list] = None
    notes: Optional[str] = None


@router.get("/onboarding")
async def list_onboarding(db: AsyncSession = Depends(get_db), _: dict = Depends(get_current_user)):
    result = await db.execute(select(OnboardingChecklist).order_by(desc(OnboardingChecklist.created_at)))
    return [
        {c.name: getattr(o, c.name) for c in o.__table__.columns}
        for o in result.scalars().all()
    ]


@router.post("/onboarding")
async def create_onboarding(data: OnboardingCreate, db: AsyncSession = Depends(get_db), _: dict = Depends(require_write_access)):
    ob = OnboardingChecklist(**data.model_dump())
    db.add(ob)
    await db.commit()
    return {"created": True, "id": str(ob.id)}


@router.put("/onboarding/{ob_id}")
async def update_onboarding(ob_id: UUID, data: OnboardingUpdate, db: AsyncSession = Depends(get_db), _: dict = Depends(require_write_access)):
    result = await db.execute(select(OnboardingChecklist).where(OnboardingChecklist.id == ob_id))
    ob = result.scalar_one_or_none()
    if not ob:
        raise HTTPException(status_code=404, detail="Onboarding not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(ob, k, v)
    await db.commit()
    return {"updated": True}


# ═══════════════════════════════════════════════════════════════
# Churn
# ═══════════════════════════════════════════════════════════════

class ChurnCreate(PydanticModel):
    client_name: str
    lead_id: Optional[str] = None
    churn_date: Optional[str] = None
    churn_reason: str
    churn_category: Optional[str] = None
    previous_arr: float = 0
    contract_duration_months: Optional[int] = None
    last_nps: Optional[int] = None
    warning_signals: Optional[str] = None
    retention_attempts: Optional[str] = None
    competitor_switched_to: Optional[str] = None
    win_back_possible: Optional[str] = None
    lessons_learned: Optional[str] = None
    notes: Optional[str] = None


@router.get("/churn")
async def list_churn(db: AsyncSession = Depends(get_db), _: dict = Depends(get_current_user)):
    result = await db.execute(select(ChurnRecord).order_by(desc(ChurnRecord.created_at)))
    return [
        {c.name: getattr(c_rec, c.name) for c in c_rec.__table__.columns}
        for c_rec in result.scalars().all()
    ]


@router.post("/churn")
async def create_churn(data: ChurnCreate, db: AsyncSession = Depends(get_db), _: dict = Depends(require_write_access)):
    churn = ChurnRecord(**data.model_dump())
    db.add(churn)
    await db.commit()
    return {"created": True, "id": str(churn.id)}


# ═══════════════════════════════════════════════════════════════
# ROI Calculator
# ═══════════════════════════════════════════════════════════════

class ROICreate(PydanticModel):
    client_name: str
    lead_id: Optional[str] = None
    current_fte_cost: float = 0
    current_tools_cost: float = 0
    current_audit_cost: float = 0
    current_incident_cost: float = 0
    current_penalty_risk: float = 0
    riskitera_license_cost: float = 0
    riskitera_implementation_cost: float = 0
    riskitera_training_cost: float = 0
    notes: Optional[str] = None


@router.get("/roi")
async def list_roi(db: AsyncSession = Depends(get_db), _: dict = Depends(get_current_user)):
    result = await db.execute(select(ROICalculation).order_by(desc(ROICalculation.created_at)))
    return [
        {c.name: getattr(r, c.name) for c in r.__table__.columns}
        for r in result.scalars().all()
    ]


@router.post("/roi")
async def create_roi(data: ROICreate, db: AsyncSession = Depends(get_db), _: dict = Depends(require_write_access)):
    total_current = data.current_fte_cost + data.current_tools_cost + data.current_audit_cost + data.current_incident_cost + data.current_penalty_risk
    total_riskitera = data.riskitera_license_cost + data.riskitera_implementation_cost + data.riskitera_training_cost
    total_savings = total_current - total_riskitera
    roi_pct = round((total_savings / max(total_riskitera, 1)) * 100, 1)
    payback = round(total_riskitera / max(total_savings / 12, 1)) if total_savings > 0 else 0
    three_year = total_savings * 3 - total_riskitera

    roi = ROICalculation(
        **data.model_dump(),
        total_current_cost=total_current,
        total_riskitera_cost=total_riskitera,
        fte_savings=data.current_fte_cost * 0.6,
        tools_savings=data.current_tools_cost * 0.8,
        audit_savings=data.current_audit_cost * 0.5,
        risk_reduction=data.current_penalty_risk * 0.9,
        total_savings=total_savings,
        roi_pct=roi_pct,
        payback_months=payback,
        three_year_value=three_year,
    )
    db.add(roi)
    await db.commit()
    return {
        "created": True, "id": str(roi.id),
        "total_current": total_current, "total_riskitera": total_riskitera,
        "total_savings": total_savings, "roi_pct": roi_pct,
        "payback_months": payback, "three_year_value": three_year,
    }


@router.get("/roi/{roi_id}")
async def get_roi(roi_id: UUID, db: AsyncSession = Depends(get_db), _: dict = Depends(get_current_user)):
    result = await db.execute(select(ROICalculation).where(ROICalculation.id == roi_id))
    roi = result.scalar_one_or_none()
    if not roi:
        raise HTTPException(status_code=404, detail="ROI not found")
    return {c.name: getattr(roi, c.name) for c in roi.__table__.columns}


# ═══════════════════════════════════════════════════════════════
# Smart Forms — AI-powered form personalization
# ═══════════════════════════════════════════════════════════════

@router.post("/generate-smart")
async def generate_smart_form(
    lead_id: UUID = Query(None),
    form_type: str = Query("lead", max_length=50),
    sector: str = Query(None, max_length=100),
    regulatory_focus: str = Query(None, max_length=200),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Genera campos de formulario personalizados con IA basados en el tipo de lead."""
    # If lead_id provided, get lead data for context
    context = ""
    if lead_id:
        from app.models.lead import Lead
        lead = await db.get(Lead, lead_id)
        if lead:
            context = f"Lead: {lead.company_name}, Sector: {lead.company_sector}, Tamano: {lead.company_size}, Frameworks: {lead.regulatory_frameworks}"

    if sector:
        context += f"\nSector especifico: {sector}"
    if regulatory_focus:
        context += f"\nFoco regulatorio: {regulatory_focus}"

    try:
        import json
        from app.services.ai_chat_service import AIChatService
        service = AIChatService()

        prompt = f"""Genera los campos ideales para un formulario de tipo '{form_type}' para un prospect de ventas B2B.

Contexto: {context or 'Generico - empresa espanola'}

Devuelve SOLO un JSON array con este formato exacto:
[
  {{"field": "nombre_campo", "label": "Label visible", "type": "text|select|textarea|number|date|email|phone|checkbox", "required": true|false, "placeholder": "texto placeholder", "options": ["opt1", "opt2"] }}
]

Genera 6-10 campos relevantes. Para selects, incluye opciones especificas del sector.
Incluye campos de:
- Datos de contacto basicos
- Informacion de la empresa
- Necesidades de compliance especificas del sector
- Presupuesto/timeline
- Pregunta de cualificacion BANT

Campos en espanol."""

        result = await service.chat(
            messages=[{"role": "user", "content": prompt}],
            system_prompt="Eres un experto en formularios de captacion B2B para ventas B2B. Responde SOLO en JSON valido.",
        )

        # Parse JSON from response
        text = result.get("content", "[]")
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]

        fields = json.loads(text.strip())
        return {"fields": fields, "form_type": form_type, "context": context[:200]}

    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error generando formulario: {str(e)}")
