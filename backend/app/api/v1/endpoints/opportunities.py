from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.permissions import require_write_access, apply_lead_row_filter
from app.models import Opportunity
from app.schemas import OpportunityCreate, OpportunityResponse, OpportunityUpdate, PaginatedResponse
from app.services.notification_service import notification_service

import logging
logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=PaginatedResponse)
async def list_opportunities(
    lead_id: Optional[UUID] = None,
    stage: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    query = select(Opportunity).order_by(Opportunity.created_at.desc())
    query = apply_lead_row_filter(query, current_user, Opportunity.lead_id)
    if lead_id:
        query = query.where(Opportunity.lead_id == lead_id)
    if stage:
        query = query.where(Opportunity.stage == stage)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()

    # Paginate
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)

    return PaginatedResponse(
        items=[OpportunityResponse.model_validate(o) for o in result.scalars().all()],
        total=total, page=page,
        page_size=page_size, pages=(total + page_size - 1) // page_size,
    )


@router.post("/", response_model=OpportunityResponse, status_code=201)
async def create_opportunity(
    data: OpportunityCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    opportunity = Opportunity(**data.model_dump())
    db.add(opportunity)
    await db.commit()
    await db.refresh(opportunity)

    # Notificación (no bloquea la operación principal)
    try:
        user_id = UUID(current_user["user_id"])
        await notification_service.notify_opportunity_created(
            db=db,
            user_id=user_id,
            opportunity_id=opportunity.id,
            name=opportunity.name,
            amount=opportunity.value,
        )
    except Exception:
        logger.warning("Failed to send opportunity creation notification", exc_info=True)

    return OpportunityResponse.model_validate(opportunity)


@router.get("/{opportunity_id}", response_model=OpportunityResponse)
async def get_opportunity(
    opportunity_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(select(Opportunity).where(Opportunity.id == opportunity_id))
    opp = result.scalar_one_or_none()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    return OpportunityResponse.model_validate(opp)


@router.delete("/{opportunity_id}", status_code=204)
async def delete_opportunity(
    opportunity_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    result = await db.execute(select(Opportunity).where(Opportunity.id == opportunity_id))
    opp = result.scalar_one_or_none()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    await db.delete(opp)
    await db.commit()


@router.put("/{opportunity_id}", response_model=OpportunityResponse)
async def update_opportunity(
    opportunity_id: UUID,
    data: OpportunityUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Update an opportunity."""
    result = await db.execute(select(Opportunity).where(Opportunity.id == opportunity_id))
    opp = result.scalar_one_or_none()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")

    # Guardar estado anterior
    old_stage = opp.stage

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(opp, key, value)

    await db.commit()
    await db.refresh(opp)

    # Notificaciones (no bloquean la operación principal)
    try:
        user_id = UUID(current_user["user_id"])

        if "stage" in update_data and old_stage != opp.stage:
            if opp.stage == "closed_won":
                await notification_service.notify_opportunity_won(
                    db=db,
                    user_id=user_id,
                    opportunity_id=opp.id,
                    name=opp.name,
                    amount=opp.value or 0,
                )
            else:
                await notification_service.notify_opportunity_stage_changed(
                    db=db,
                    user_id=user_id,
                    opportunity_id=opp.id,
                    name=opp.name,
                    old_stage=old_stage,
                    new_stage=opp.stage,
                )
    except Exception:
        logger.warning("Failed to send opportunity update notifications", exc_info=True)

    # Dispatch to workflow engine
    try:
        from app.core.workflow_engine import dispatch_event
        if "stage" in update_data and old_stage != opp.stage:
            event_name = "opportunity.won" if opp.stage == "closed_won" else "opportunity.lost" if opp.stage == "closed_lost" else "opportunity.stage_changed"
            await dispatch_event(event_name, {
                "opportunity_id": str(opp.id), "lead_id": str(opp.lead_id),
                "name": opp.name, "value": float(opp.value or 0),
                "old_stage": str(old_stage), "new_stage": str(opp.stage),
                "title": f"Deal {opp.name}: {old_stage} -> {opp.stage}",
                "message": f"Valor: {opp.value or 0} EUR",
            }, db)
    except Exception:
        pass

    return OpportunityResponse.model_validate(opp)


@router.post("/{opportunity_id}/forecast")
async def forecast_opportunity(
    opportunity_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Genera un forecast con IA para una oportunidad especifica."""
    from app.models import Lead
    result = await db.execute(
        select(Opportunity, Lead)
        .join(Lead, Opportunity.lead_id == Lead.id, isouter=True)
        .where(Opportunity.id == opportunity_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    opp, lead = row

    context = (
        f"Oportunidad: {opp.name}\n"
        f"Empresa: {lead.company_name if lead else 'N/A'}\n"
        f"Valor: {opp.value or 0} EUR\n"
        f"Etapa actual: {opp.stage}\n"
        f"Fecha cierre esperada: {opp.expected_close_date or 'No definida'}\n"
        f"Sector: {lead.company_sector if lead else 'N/A'}\n"
        f"Score lead: {lead.score if lead else 'N/A'}\n"
    )

    prompt = (
        f"Analiza esta oportunidad de venta y genera un forecast:\n\n{context}\n\n"
        "Devuelve:\n"
        "1. Probabilidad de cierre (0-100%)\n"
        "2. Fecha estimada de cierre\n"
        "3. Valor ajustado (si hay riesgo de downsell)\n"
        "4. Factores positivos\n"
        "5. Factores de riesgo\n"
        "6. Acciones recomendadas\n"
    )

    try:
        from app.agents.lead_intelligence import _call_llm
        result = await _call_llm(
            "Eres un analista de ventas B2B de ventas B2B experto en forecasting.",
            prompt,
        )
        return {
            "opportunity_id": str(opp.id),
            "forecast": result.get("content", ""),
            "model": result.get("model"),
        }
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Error generando forecast: {str(e)}")
