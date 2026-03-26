from typing import Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.tenant import get_org_id
from app.core.permissions import require_write_access, apply_lead_row_filter
from app.models import Action
from app.schemas import ActionCreate, ActionUpdate, ActionResponse, PaginatedResponse
from app.services.notification_service import notification_service

import logging
logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/", response_model=PaginatedResponse)
async def list_actions(
    lead_id: Optional[UUID] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    org_id: str = Depends(get_org_id),
):
    query = select(Action).order_by(Action.due_date.asc())
    query = query.where(Action.org_id == org_id)
    query = apply_lead_row_filter(query, current_user, Action.lead_id)
    if lead_id:
        query = query.where(Action.lead_id == lead_id)
    if status:
        query = query.where(Action.status == status)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()

    # Paginate
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)

    return PaginatedResponse(
        items=[ActionResponse.model_validate(a) for a in result.scalars().all()],
        total=total, page=page,
        page_size=page_size, pages=(total + page_size - 1) // page_size,
    )


@router.post("/", response_model=ActionResponse, status_code=201)
async def create_action(
    data: ActionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
    org_id: str = Depends(get_org_id),
):
    action = Action(**data.model_dump())
    action.org_id = org_id
        db.add(action)
    await db.commit()
    await db.refresh(action)

    # Notificaciones (no bloquean la operación principal)
    try:
        user_id = UUID(current_user["user_id"])
        await notification_service.notify_action_created(
            db=db,
            user_id=user_id,
            action_id=action.id,
            title=action.title,
            due_date=action.due_date,
        )

        if action.due_date:
            days_until = (action.due_date - datetime.now().date()).days
            if 0 < days_until <= 2:
                await notification_service.notify_action_due_soon(
                    db=db,
                    user_id=user_id,
                    action_id=action.id,
                    title=action.title,
                    due_date=datetime.combine(action.due_date, datetime.min.time()),
                )
    except Exception:
        logger.warning("Failed to send action notifications", exc_info=True)

    return ActionResponse.model_validate(action)


@router.put("/{action_id}", response_model=ActionResponse)
async def update_action(
    action_id: UUID,
    data: ActionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
    org_id: str = Depends(get_org_id),
):
    result = await db.execute(select(Action).where(Action.id == action_id))
    action = result.scalar_one_or_none()
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(action, key, value)
    await db.commit()
    await db.refresh(action)
    return ActionResponse.model_validate(action)


@router.delete("/{action_id}", status_code=204)
async def delete_action(
    action_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
    org_id: str = Depends(get_org_id),
):
    result = await db.execute(select(Action).where(Action.id == action_id))
    action = result.scalar_one_or_none()
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
    await db.delete(action)
    await db.commit()
