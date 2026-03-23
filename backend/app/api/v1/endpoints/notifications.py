from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, func
from typing import Optional
from uuid import UUID
from datetime import datetime, timezone
import asyncio
import json

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.notification import Notification, NotificationType, NotificationPriority
from app.schemas.notification import (
    NotificationCreate,
    NotificationUpdate,
    NotificationResponse,
    NotificationStats,
)
from app.schemas import PaginatedResponse

router = APIRouter()


@router.get("/stream")
async def notification_stream(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Server-Sent Events stream for real-time notifications."""
    user_id = UUID(current_user["user_id"])

    async def event_generator():
        last_count = -1
        while True:
            try:
                # Check for new unread notifications
                count = (await db.execute(
                    select(func.count(Notification.id))
                    .where(Notification.user_id == user_id, Notification.is_read.is_(False))
                )).scalar() or 0

                if count != last_count:
                    data = json.dumps({"unread": count})
                    yield f"data: {data}\n\n"
                    last_count = count

                await asyncio.sleep(10)  # Check every 10 seconds
            except Exception:
                break

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


@router.get("", response_model=PaginatedResponse)
async def list_notifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    is_read: Optional[bool] = None,
    type: Optional[NotificationType] = None,
    priority: Optional[NotificationPriority] = None,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Lista notificaciones del usuario actual con filtros.

    - **is_read**: Filtrar por leídas/no leídas
    - **type**: Filtrar por tipo (system, lead, action, etc.)
    - **priority**: Filtrar por prioridad (low, medium, high, urgent)
    """
    user_id = UUID(current_user["user_id"])

    # Build query
    query = select(Notification).where(Notification.user_id == user_id)

    if is_read is not None:
        query = query.where(Notification.is_read == is_read)
    if type:
        query = query.where(Notification.type == type)
    if priority:
        query = query.where(Notification.priority == priority)

    # Order by created_at desc (más recientes primero)
    query = query.order_by(Notification.created_at.desc())

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query)

    # Paginate
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    notifications = result.scalars().all()

    total_count = total or 0
    return PaginatedResponse(
        items=[NotificationResponse.model_validate(n) for n in notifications],
        total=total_count,
        page=page,
        page_size=page_size,
        pages=max(1, (total_count + page_size - 1) // page_size),
    )


@router.get("/stats", response_model=NotificationStats)
async def get_notification_stats(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Obtiene estadísticas de notificaciones del usuario actual.
    """
    user_id = UUID(current_user["user_id"])

    # Total notifications
    total_query = select(func.count()).select_from(Notification).where(Notification.user_id == user_id)
    total = await db.scalar(total_query) or 0

    # Unread notifications
    unread_query = select(func.count()).select_from(Notification).where(
        Notification.user_id == user_id,
        Notification.is_read.is_(False)
    )
    unread = await db.scalar(unread_query) or 0

    # By type
    type_query = select(
        Notification.type,
        func.count(Notification.id)
    ).where(
        Notification.user_id == user_id
    ).group_by(Notification.type)

    type_result = await db.execute(type_query)
    by_type = {str(row[0].value) if hasattr(row[0], 'value') else str(row[0]): row[1] for row in type_result.all()}

    # By priority
    priority_query = select(
        Notification.priority,
        func.count(Notification.id)
    ).where(
        Notification.user_id == user_id
    ).group_by(Notification.priority)

    priority_result = await db.execute(priority_query)
    by_priority = {str(row[0].value) if hasattr(row[0], 'value') else str(row[0]): row[1] for row in priority_result.all()}

    return NotificationStats(
        total=total,
        unread=unread,
        by_type=by_type,
        by_priority=by_priority,
    )


@router.get("/{notification_id}", response_model=NotificationResponse)
async def get_notification(
    notification_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Obtiene una notificación por ID.
    """
    user_id = UUID(current_user["user_id"])

    query = select(Notification).where(
        Notification.id == notification_id,
        Notification.user_id == user_id
    )
    result = await db.execute(query)
    notification = result.scalar_one_or_none()

    if not notification:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")

    return NotificationResponse.model_validate(notification)


@router.post("", response_model=NotificationResponse, status_code=201)
async def create_notification(
    notification: NotificationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Crea una notificación.
    (Generalmente usado por el sistema, no por usuarios directamente)
    """
    db_notification = Notification(**notification.model_dump())
    db.add(db_notification)
    await db.commit()
    await db.refresh(db_notification)

    return NotificationResponse.model_validate(db_notification)


@router.patch("/{notification_id}", response_model=NotificationResponse)
async def update_notification(
    notification_id: UUID,
    notification_update: NotificationUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Actualiza una notificación (principalmente para marcar como leída/no leída).
    """
    user_id = UUID(current_user["user_id"])

    # Verify ownership
    query = select(Notification).where(
        Notification.id == notification_id,
        Notification.user_id == user_id
    )
    result = await db.execute(query)
    notification = result.scalar_one_or_none()

    if not notification:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")

    # Update fields
    update_data = notification_update.model_dump(exclude_unset=True)

    # Si se marca como leída, actualizar read_at
    if update_data.get("is_read") is True and not notification.is_read:
        update_data["read_at"] = datetime.now(timezone.utc)
    elif update_data.get("is_read") is False:
        update_data["read_at"] = None

    for field, value in update_data.items():
        setattr(notification, field, value)

    await db.commit()
    await db.refresh(notification)

    return NotificationResponse.model_validate(notification)


@router.post("/mark-all-read", status_code=200)
async def mark_all_as_read(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Marca todas las notificaciones del usuario como leídas.
    """
    user_id = UUID(current_user["user_id"])

    stmt = (
        update(Notification)
        .where(
            Notification.user_id == user_id,
            Notification.is_read.is_(False)
        )
        .values(is_read=True, read_at=datetime.now(timezone.utc))
    )

    result = await db.execute(stmt)
    await db.commit()

    return {"message": f"{result.rowcount} notificaciones marcadas como leídas"}


@router.delete("/{notification_id}", status_code=204)
async def delete_notification(
    notification_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Elimina una notificación.
    """
    user_id = UUID(current_user["user_id"])

    stmt = delete(Notification).where(
        Notification.id == notification_id,
        Notification.user_id == user_id
    )

    result = await db.execute(stmt)
    await db.commit()

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Notificación no encontrada")

    return None
