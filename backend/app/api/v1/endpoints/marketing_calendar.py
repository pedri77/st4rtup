"""Endpoints CRUD para el calendario de marketing."""
import logging
from typing import Optional
from uuid import UUID
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.tenant import get_org_id
from app.core.security import get_current_user
from app.core.permissions import require_write_access
from app.models.marketing import MarketingCalendarEvent
from app.schemas.marketing import (
    MarketingCalendarEventCreate, MarketingCalendarEventUpdate,
    MarketingCalendarEventResponse,
)
from app.schemas.base import PaginatedResponse
from app.services import notion_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("", response_model=PaginatedResponse)
async def list_events(
    event_type: Optional[str] = None,
    campaign_id: Optional[UUID] = None,
    start_from: Optional[datetime] = None,
    start_until: Optional[datetime] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
org_id: str = Depends(get_org_id),
):
    """Lista eventos del calendario de marketing con filtros."""
    query = select(MarketingCalendarEvent).where(MarketingCalendarEvent.org_id == org_id).order_by(MarketingCalendarEvent.start_date.asc())
    if event_type:
        query = query.where(MarketingCalendarEvent.event_type == event_type)
    if campaign_id:
        query = query.where(MarketingCalendarEvent.campaign_id == campaign_id)
    if start_from:
        query = query.where(MarketingCalendarEvent.start_date >= start_from)
    if start_until:
        query = query.where(MarketingCalendarEvent.start_date <= start_until)

    count_query = select(func.count()).select_from(query.subquery())
    total = await db.scalar(count_query) or 0

    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)

    return PaginatedResponse(
        items=[MarketingCalendarEventResponse.model_validate(e) for e in result.scalars().all()],
        total=total, page=page,
        page_size=page_size, pages=max(1, (total + page_size - 1) // page_size),
    )


@router.post("", response_model=MarketingCalendarEventResponse, status_code=201)
async def create_event(
    data: MarketingCalendarEventCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
org_id: str = Depends(get_org_id),
):
    """Crea un evento en el calendario de marketing."""
    event = MarketingCalendarEvent(
        **data.model_dump(), created_by=UUID(current_user["user_id"]),
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return MarketingCalendarEventResponse.model_validate(event)


# ─── Notion Sync (before /{event_id} to avoid UUID matching) ─


@router.get("/notion/status")
async def notion_status(
    current_user: dict = Depends(get_current_user),
org_id: str = Depends(get_org_id),
):
    """Comprueba la conexión con Notion."""
    return await notion_service.test_connection()


@router.post("/notion/push")
async def notion_push_events(
    start_from: Optional[str] = None,
    start_until: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
org_id: str = Depends(get_org_id),
):
    """Empuja eventos del calendario a Notion."""
    query = select(MarketingCalendarEvent).where(MarketingCalendarEvent.org_id == org_id).order_by(MarketingCalendarEvent.start_date.asc())
    if start_from:
        query = query.where(MarketingCalendarEvent.start_date >= start_from)
    if start_until:
        query = query.where(MarketingCalendarEvent.start_date <= start_until)

    result = await db.execute(query)
    events = result.scalars().all()

    pushed = 0
    errors = 0
    for ev in events:
        res = await notion_service.push_event(
            title=ev.title,
            event_type=ev.event_type.value if hasattr(ev.event_type, 'value') else str(ev.event_type),
            start_date=ev.start_date,
            end_date=ev.end_date,
            description=ev.description,
            channel=ev.channel,
        )
        if res:
            pushed += 1
        else:
            errors += 1

    return {"pushed": pushed, "errors": errors, "total": len(events)}


@router.post("/notion/pull")
async def notion_pull_events(
    start_after: Optional[str] = None,
    start_before: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
org_id: str = Depends(get_org_id),
):
    """Importa eventos desde Notion al calendario."""
    notion_events = await notion_service.pull_events(start_after, start_before)

    imported = 0
    skipped = 0
    for nev in notion_events:
        if not nev.get("start_date"):
            skipped += 1
            continue

        # Check for duplicates by title + date
        start_dt = datetime.fromisoformat(nev["start_date"])
        existing = await db.execute(
            select(MarketingCalendarEvent).where(
                MarketingCalendarEvent.title == nev["title"],
                func.date(MarketingCalendarEvent.start_date) == start_dt.date(),
            )
        )
        if existing.scalar_one_or_none():
            skipped += 1
            continue

        event = MarketingCalendarEvent(
            title=nev["title"],
            event_type=nev["event_type"],
            start_date=start_dt,
            end_date=datetime.fromisoformat(nev["end_date"]) if nev.get("end_date") else None,
            channel=nev.get("channel"),
            all_day=True,
            created_by=UUID(current_user["user_id"]),
        )
        db.add(event)
        imported += 1

    if imported > 0:
        await db.commit()

    return {"imported": imported, "skipped": skipped, "total_notion": len(notion_events)}


# ─── CRUD by ID ───────────────────────────────────────────────


@router.get("/{event_id}", response_model=MarketingCalendarEventResponse)
async def get_event(
    event_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
org_id: str = Depends(get_org_id),
):
    """Obtiene un evento por ID."""
    result = await db.execute(
        select(MarketingCalendarEvent).where(MarketingCalendarEvent.id == event_id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    return MarketingCalendarEventResponse.model_validate(event)


@router.put("/{event_id}", response_model=MarketingCalendarEventResponse)
async def update_event(
    event_id: UUID,
    data: MarketingCalendarEventUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
org_id: str = Depends(get_org_id),
):
    """Actualiza un evento del calendario."""
    result = await db.execute(
        select(MarketingCalendarEvent).where(MarketingCalendarEvent.id == event_id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Evento no encontrado")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(event, key, value)

    await db.commit()
    await db.refresh(event)
    return MarketingCalendarEventResponse.model_validate(event)


@router.delete("/{event_id}", status_code=204)
async def delete_event(
    event_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_write_access),
org_id: str = Depends(get_org_id),
):
    """Elimina un evento del calendario."""
    result = await db.execute(
        select(MarketingCalendarEvent).where(MarketingCalendarEvent.id == event_id)
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    await db.delete(event)
    await db.commit()
