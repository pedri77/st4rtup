from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.tenant import get_org_id
from app.core.permissions import require_write_access, apply_lead_row_filter
from app.models import Visit, Lead
from app.schemas import VisitCreate, VisitUpdate, VisitResponse, PaginatedResponse
from app.services.notification_service import notification_service

import logging
logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=PaginatedResponse)
async def list_visits(
    lead_id: Optional[UUID] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    org_id: str = Depends(get_org_id),
):
    """Listar visitas con nombre del lead incluido."""
    query = select(Visit, Lead.company_name).join(Lead, Visit.lead_id == Lead.id, isouter=True).order_by(Visit.visit_date.desc())
    query = apply_lead_row_filter(query, current_user, Visit.lead_id)
    if lead_id:
        query = query.where(Visit.lead_id == lead_id)

    # Count
    count_base = select(func.count(Visit.id))
    if lead_id:
        count_base = count_base.where(Visit.lead_id == lead_id)
    total = (await db.execute(count_base)).scalar()

    # Paginate
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)

    visits = []
    for visit, company_name in result:
        visit_data = VisitResponse.model_validate(visit)
        visit_data.lead_name = company_name
        visits.append(visit_data)

    return PaginatedResponse(
        items=visits, total=total, page=page,
        page_size=page_size, pages=(total + page_size - 1) // page_size,
    )


@router.post("/", response_model=VisitResponse, status_code=201)
async def create_visit(
    data: VisitCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
    org_id: str = Depends(get_org_id),
):
    visit = Visit(**data.model_dump())
    visit.org_id = org_id
        db.add(visit)
    await db.commit()
    await db.refresh(visit)

    # Obtener nombre de la empresa del lead
    lead_result = await db.execute(select(Lead).where(Lead.id == visit.lead_id))
    lead = lead_result.scalar_one_or_none()
    company_name = lead.company_name if lead else "Cliente"

    # Notificación (no bloquea la operación principal)
    try:
        user_id = UUID(current_user["user_id"])
        await notification_service.notify_visit_scheduled(
            db=db,
            user_id=user_id,
            visit_id=visit.id,
            company_name=company_name,
            visit_date=visit.visit_date,
        )
    except Exception:
        logger.warning("Failed to send visit notification", exc_info=True)

    return VisitResponse.model_validate(visit)


@router.get("/{visit_id}", response_model=VisitResponse)
async def get_visit(
    visit_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(select(Visit).where(Visit.id == visit_id))
    visit = result.scalar_one_or_none()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    return VisitResponse.model_validate(visit)


@router.put("/{visit_id}", response_model=VisitResponse)
async def update_visit(
    visit_id: UUID,
    data: VisitUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
    org_id: str = Depends(get_org_id),
):
    result = await db.execute(select(Visit).where(Visit.id == visit_id))
    visit = result.scalar_one_or_none()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(visit, key, value)

    await db.commit()
    await db.refresh(visit)
    return VisitResponse.model_validate(visit)


@router.delete("/{visit_id}", status_code=204)
async def delete_visit(
    visit_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
    org_id: str = Depends(get_org_id),
):
    result = await db.execute(select(Visit).where(Visit.id == visit_id))
    visit = result.scalar_one_or_none()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    await db.delete(visit)
    await db.commit()
