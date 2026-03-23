"""Endpoints CRUD para campañas de marketing."""
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.permissions import require_write_access
from app.models.marketing import Campaign
from app.schemas.marketing import CampaignCreate, CampaignUpdate, CampaignResponse
from app.schemas.base import PaginatedResponse

router = APIRouter()


@router.get("", response_model=PaginatedResponse)
async def list_campaigns(
    status: Optional[str] = None,
    channel: Optional[str] = None,
    objective: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lista campañas de marketing con filtros."""
    query = select(Campaign).order_by(Campaign.created_at.desc())
    if status:
        query = query.where(Campaign.status == status)
    if channel:
        query = query.where(Campaign.channel == channel)
    if objective:
        query = query.where(Campaign.objective == objective)

    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query) or 0

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)

    return PaginatedResponse(
        items=[CampaignResponse.model_validate(c) for c in result.scalars().all()],
        total=total, page=page,
        page_size=page_size, pages=max(1, (total + page_size - 1) // page_size),
    )


@router.post("", response_model=CampaignResponse, status_code=201)
async def create_campaign(
    data: CampaignCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Crea una campaña de marketing."""
    campaign = Campaign(**data.model_dump(), created_by=UUID(current_user["user_id"]))
    db.add(campaign)
    await db.commit()
    await db.refresh(campaign)
    return CampaignResponse.model_validate(campaign)


@router.get("/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(
    campaign_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Obtiene una campaña por ID."""
    result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaña no encontrada")
    return CampaignResponse.model_validate(campaign)


@router.put("/{campaign_id}", response_model=CampaignResponse)
async def update_campaign(
    campaign_id: UUID,
    data: CampaignUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Actualiza una campaña de marketing."""
    result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaña no encontrada")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(campaign, key, value)

    await db.commit()
    await db.refresh(campaign)
    return CampaignResponse.model_validate(campaign)


@router.delete("/{campaign_id}", status_code=204)
async def delete_campaign(
    campaign_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Elimina una campaña de marketing."""
    result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaña no encontrada")
    await db.delete(campaign)
    await db.commit()
