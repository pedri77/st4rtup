"""Endpoints CRUD para assets de marketing (landing pages, CTAs)."""
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.permissions import require_write_access
from app.models.marketing import MarketingAsset
from app.schemas.marketing import (
    MarketingAssetCreate, MarketingAssetUpdate, MarketingAssetResponse,
)
from app.schemas.base import PaginatedResponse

router = APIRouter()


@router.get("", response_model=PaginatedResponse)
async def list_assets(
    status: Optional[str] = None,
    type: Optional[str] = None,
    campaign_id: Optional[UUID] = None,
    language: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lista assets de marketing con filtros."""
    query = select(MarketingAsset).order_by(MarketingAsset.created_at.desc())
    if status:
        query = query.where(MarketingAsset.status == status)
    if type:
        query = query.where(MarketingAsset.type == type)
    if campaign_id:
        query = query.where(MarketingAsset.campaign_id == campaign_id)
    if language:
        query = query.where(MarketingAsset.language == language)

    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query) or 0

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)

    return PaginatedResponse(
        items=[MarketingAssetResponse.model_validate(a) for a in result.scalars().all()],
        total=total, page=page,
        page_size=page_size, pages=max(1, (total + page_size - 1) // page_size),
    )


@router.post("", response_model=MarketingAssetResponse, status_code=201)
async def create_asset(
    data: MarketingAssetCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Crea un asset de marketing."""
    asset = MarketingAsset(**data.model_dump(), created_by=UUID(current_user["user_id"]))
    db.add(asset)
    await db.commit()
    await db.refresh(asset)
    return MarketingAssetResponse.model_validate(asset)


@router.get("/{asset_id}", response_model=MarketingAssetResponse)
async def get_asset(
    asset_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Obtiene un asset por ID."""
    result = await db.execute(select(MarketingAsset).where(MarketingAsset.id == asset_id))
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset no encontrado")
    return MarketingAssetResponse.model_validate(asset)


@router.put("/{asset_id}", response_model=MarketingAssetResponse)
async def update_asset(
    asset_id: UUID,
    data: MarketingAssetUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Actualiza un asset de marketing."""
    result = await db.execute(select(MarketingAsset).where(MarketingAsset.id == asset_id))
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset no encontrado")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(asset, key, value)

    await db.commit()
    await db.refresh(asset)
    return MarketingAssetResponse.model_validate(asset)


@router.delete("/{asset_id}", status_code=204)
async def delete_asset(
    asset_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Elimina un asset de marketing."""
    result = await db.execute(select(MarketingAsset).where(MarketingAsset.id == asset_id))
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset no encontrado")
    await db.delete(asset)
    await db.commit()
