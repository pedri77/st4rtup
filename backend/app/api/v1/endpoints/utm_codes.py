"""Endpoints CRUD para códigos UTM."""
from typing import Optional
from uuid import UUID
from urllib.parse import urlencode
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.permissions import require_write_access
from app.models.marketing import UTMCode
from app.schemas.marketing import UTMCodeCreate, UTMCodeResponse
from app.schemas.base import PaginatedResponse

router = APIRouter()


def build_utm_url(data: UTMCodeCreate) -> str:
    """Genera la URL completa con parámetros UTM."""
    params = {
        "utm_source": data.utm_source,
        "utm_medium": data.utm_medium,
        "utm_campaign": data.utm_campaign,
    }
    if data.utm_content:
        params["utm_content"] = data.utm_content
    if data.utm_term:
        params["utm_term"] = data.utm_term

    separator = "&" if "?" in data.base_url else "?"
    return f"{data.base_url}{separator}{urlencode(params)}"


@router.get("", response_model=PaginatedResponse)
async def list_utm_codes(
    campaign_id: Optional[UUID] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lista códigos UTM con filtros."""
    query = select(UTMCode).order_by(UTMCode.created_at.desc())
    if campaign_id:
        query = query.where(UTMCode.campaign_id == campaign_id)

    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query) or 0

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)

    return PaginatedResponse(
        items=[UTMCodeResponse.model_validate(u) for u in result.scalars().all()],
        total=total, page=page,
        page_size=page_size, pages=max(1, (total + page_size - 1) // page_size),
    )


@router.post("", response_model=UTMCodeResponse, status_code=201)
async def create_utm_code(
    data: UTMCodeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Crea un código UTM con URL generada automáticamente."""
    full_url = build_utm_url(data)
    utm = UTMCode(
        **data.model_dump(),
        full_url=full_url,
        created_by=UUID(current_user["user_id"]),
    )
    db.add(utm)
    await db.commit()
    await db.refresh(utm)
    return UTMCodeResponse.model_validate(utm)


@router.get("/{utm_id}", response_model=UTMCodeResponse)
async def get_utm_code(
    utm_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Obtiene un código UTM por ID."""
    result = await db.execute(select(UTMCode).where(UTMCode.id == utm_id))
    utm = result.scalar_one_or_none()
    if not utm:
        raise HTTPException(status_code=404, detail="UTM no encontrado")
    return UTMCodeResponse.model_validate(utm)


@router.delete("/{utm_id}", status_code=204)
async def delete_utm_code(
    utm_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Elimina un código UTM."""
    result = await db.execute(select(UTMCode).where(UTMCode.id == utm_id))
    utm = result.scalar_one_or_none()
    if not utm:
        raise HTTPException(status_code=404, detail="UTM no encontrado")
    await db.delete(utm)
    await db.commit()
