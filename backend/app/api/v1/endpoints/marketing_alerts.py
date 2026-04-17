"""Endpoints CRUD para alertas de marketing."""
import logging
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func

from app.core.database import get_db
from app.core.tenant import get_org_id
from app.core.security import get_current_user
from app.core.permissions import require_write_access
from app.models.marketing import MarketingAlert
from app.schemas.marketing import (
    MarketingAlertCreate, MarketingAlertUpdate, MarketingAlertResponse,
)
from app.schemas.base import PaginatedResponse
from app.services.alert_engine import run_alert_engine

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("", response_model=PaginatedResponse)
async def list_alerts(
    severity: Optional[str] = None,
    entity_type: Optional[str] = None,
    is_read: Optional[bool] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Lista alertas de marketing con filtros."""
    query = select(MarketingAlert).order_by(MarketingAlert.created_at.desc())
    if severity:
        query = query.where(MarketingAlert.severity == severity)
    if entity_type:
        query = query.where(MarketingAlert.entity_type == entity_type)
    if is_read is not None:
        query = query.where(MarketingAlert.is_read.is_(is_read))

    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query) or 0

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)

    return PaginatedResponse(
        items=[MarketingAlertResponse.model_validate(a) for a in result.scalars().all()],
        total=total, page=page,
        page_size=page_size, pages=max(1, (total + page_size - 1) // page_size),
    )


@router.get("/stats")
async def get_alert_stats(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Estadísticas de alertas de marketing."""
    total = await db.scalar(select(func.count()).select_from(MarketingAlert)) or 0
    unread = await db.scalar(
        select(func.count()).select_from(MarketingAlert).where(MarketingAlert.is_read.is_(False))
    ) or 0

    severity_result = await db.execute(
        select(MarketingAlert.severity, func.count(MarketingAlert.id))
        .group_by(MarketingAlert.severity)
    )
    by_severity = {str(row[0].value) if hasattr(row[0], 'value') else str(row[0]): row[1] for row in severity_result.all()}

    return {"total": total, "unread": unread, "by_severity": by_severity}


@router.post("", response_model=MarketingAlertResponse, status_code=201)
async def create_alert(
    data: MarketingAlertCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Crea una alerta de marketing."""
    alert = MarketingAlert(
        **data.model_dump(), created_by=UUID(current_user["user_id"]),
    )
    db.add(alert)
    await db.commit()
    await db.refresh(alert)
    return MarketingAlertResponse.model_validate(alert)


@router.get("/{alert_id}", response_model=MarketingAlertResponse)
async def get_alert(
    alert_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Obtiene una alerta por ID."""
    result = await db.execute(select(MarketingAlert).where(MarketingAlert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")
    return MarketingAlertResponse.model_validate(alert)


@router.patch("/{alert_id}", response_model=MarketingAlertResponse)
async def update_alert(
    alert_id: UUID,
    data: MarketingAlertUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Actualiza una alerta (marcar leída, resolver)."""
    result = await db.execute(select(MarketingAlert).where(MarketingAlert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(alert, key, value)

    await db.commit()
    await db.refresh(alert)
    return MarketingAlertResponse.model_validate(alert)


@router.post("/mark-all-read", status_code=200)
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Marca todas las alertas como leídas."""
    stmt = (
        update(MarketingAlert)
        .where(MarketingAlert.is_read.is_(False))
        .values(is_read=True)
    )
    result = await db.execute(stmt)
    await db.commit()
    return {"message": f"{result.rowcount} alertas marcadas como leídas"}


@router.delete("/{alert_id}", status_code=204)
async def delete_alert(
    alert_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Elimina una alerta de marketing."""
    result = await db.execute(select(MarketingAlert).where(MarketingAlert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alerta no encontrada")
    await db.delete(alert)
    await db.commit()


@router.post("/engine/run")
async def trigger_alert_engine(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
):
    """Ejecuta el motor de alertas para generar alertas automáticas."""
    try:
        result = await run_alert_engine(db)
        return result
    except Exception as e:
        logger.error(f"Alert engine error: {e}")
        raise HTTPException(status_code=500, detail=f"Error ejecutando alert engine: {str(e)}")
