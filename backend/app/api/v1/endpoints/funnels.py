"""Endpoints CRUD para funnels de marketing."""
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.tenant import get_org_id
from app.core.security import get_current_user
from app.core.permissions import require_write_access
from app.models.marketing import Funnel
from app.schemas.marketing import FunnelCreate, FunnelUpdate, FunnelResponse
from app.schemas.base import PaginatedResponse

router = APIRouter()


@router.get("", response_model=PaginatedResponse)
async def list_funnels(
    status: Optional[str] = None,
    campaign_id: Optional[UUID] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lista funnels de marketing con filtros."""
    query = select(Funnel).order_by(Funnel.created_at.desc())
    if status:
        query = query.where(Funnel.status == status)
    if campaign_id:
        query = query.where(Funnel.campaign_id == campaign_id)

    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query) or 0

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)

    return PaginatedResponse(
        items=[FunnelResponse.model_validate(f) for f in result.scalars().all()],
        total=total, page=page,
        page_size=page_size, pages=max(1, (total + page_size - 1) // page_size),
    )


@router.post("", response_model=FunnelResponse, status_code=201)
async def create_funnel(
    data: FunnelCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Crea un funnel de marketing."""
    funnel = Funnel(**data.model_dump(), created_by=UUID(current_user["user_id"]))
    db.add(funnel)
    await db.commit()
    await db.refresh(funnel)
    return FunnelResponse.model_validate(funnel)


@router.get("/{funnel_id}", response_model=FunnelResponse)
async def get_funnel(
    funnel_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Obtiene un funnel por ID."""
    result = await db.execute(select(Funnel).where(Funnel.id == funnel_id))
    funnel = result.scalar_one_or_none()
    if not funnel:
        raise HTTPException(status_code=404, detail="Funnel no encontrado")
    return FunnelResponse.model_validate(funnel)


@router.put("/{funnel_id}", response_model=FunnelResponse)
async def update_funnel(
    funnel_id: UUID,
    data: FunnelUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Actualiza un funnel de marketing."""
    result = await db.execute(select(Funnel).where(Funnel.id == funnel_id))
    funnel = result.scalar_one_or_none()
    if not funnel:
        raise HTTPException(status_code=404, detail="Funnel no encontrado")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(funnel, key, value)

    await db.commit()
    await db.refresh(funnel)
    return FunnelResponse.model_validate(funnel)


@router.delete("/{funnel_id}", status_code=204)
async def delete_funnel(
    funnel_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Elimina un funnel de marketing."""
    result = await db.execute(select(Funnel).where(Funnel.id == funnel_id))
    funnel = result.scalar_one_or_none()
    if not funnel:
        raise HTTPException(status_code=404, detail="Funnel no encontrado")
    await db.delete(funnel)
    await db.commit()
