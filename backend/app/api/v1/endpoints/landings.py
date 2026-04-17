"""Landing pages + workflow audit endpoints."""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.core.database import get_db
from app.core.tenant import get_org_id
from app.core.security import get_current_user
from app.core.permissions import require_write_access
from app.models.landing import LandingPage, WorkflowAuditLog

router = APIRouter()


class LandingCreate(BaseModel):
    url: str
    name: str = ""
    campaign_id: str = ""
    clarity_project_id: str = ""


@router.get("/")
async def list_landings(
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
org_id: str = Depends(get_org_id),
):
    q = select(LandingPage).where(LandingPage.org_id == org_id).order_by(desc(LandingPage.created_at))
    if status:
        q = q.where(LandingPage.status == status)
    result = await db.execute(q)
    return {"landings": [
        {"id": str(lp.id), "url": lp.url, "name": lp.name, "visits": lp.visits,
         "conversions": lp.conversions, "conv_rate": lp.conv_rate, "bounce_rate": lp.bounce_rate,
         "status": lp.status, "campaign_id": lp.campaign_id}
        for lp in result.scalars().all()
    ]}


@router.post("/", status_code=201)
async def create_landing(data: LandingCreate, db: AsyncSession = Depends(get_db), _current_user: dict = Depends(require_write_access)):
    lp = LandingPage(**data.model_dump())
    db.add(lp)
    await db.commit()
    return {"created": True, "id": str(lp.id)}


@router.put("/{landing_id}")
async def update_landing(landing_id: UUID, visits: int = 0, conversions: int = 0,
    db: AsyncSession = Depends(get_db), _current_user: dict = Depends(require_write_access)):
    result = await db.execute(select(LandingPage).where(LandingPage.id == landing_id))
    lp = result.scalar_one_or_none()
    if not lp:
        raise HTTPException(status_code=404)
    lp.visits = visits
    lp.conversions = conversions
    lp.conv_rate = round(conversions / max(visits, 1) * 100, 1)
    await db.commit()
    return {"updated": True}


# Workflow Audit Log
@router.get("/audit")
async def list_workflow_audit(
    module: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
org_id: str = Depends(get_org_id),
):
    q = select(WorkflowAuditLog).where(WorkflowAuditLog.org_id == org_id).order_by(desc(WorkflowAuditLog.created_at)).limit(limit)
    if module:
        q = q.where(WorkflowAuditLog.module == module)
    result = await db.execute(q)
    return {"entries": [
        {"id": str(e.id), "workflow_id": e.workflow_id, "module": e.module,
         "status": e.status, "entity_type": e.entity_type, "duration_ms": e.duration_ms,
         "error_message": e.error_message, "created_at": e.created_at.isoformat() if e.created_at else None}
        for e in result.scalars().all()
    ]}


class AuditLogCreate(BaseModel):
    workflow_id: str
    module: str = ""
    trigger_type: str = "webhook"
    entity_id: str = ""
    entity_type: str = ""
    status: str = "success"
    error_message: str = ""
    duration_ms: int = 0


@router.post("/audit", status_code=201)
async def create_audit_entry(data: AuditLogCreate, db: AsyncSession = Depends(get_db)):
    """Endpoint público para que n8n registre ejecuciones."""
    entry = WorkflowAuditLog(**data.model_dump())
    db.add(entry)
    await db.commit()
    return {"created": True}
