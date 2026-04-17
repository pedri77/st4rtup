"""Audit log endpoints for tracking sensitive marketing actions."""
import logging
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.tenant import get_org_id
from app.core.security import get_current_user
from app.models.user import User
from app.models.audit_log import AuditLog
from app.schemas.audit_log import AuditLogResponse

logger = logging.getLogger(__name__)

router = APIRouter()


async def log_audit(
    db: AsyncSession,
    user: User,
    action: str,
    entity_type: str,
    entity_id: str = None,
    entity_name: str = None,
    description: str = None,
    changes: dict = None,
    ip_address: str = None,
    module: str = "marketing",
):
    """Helper to create an audit log entry. Can be called from any endpoint."""
    entry = AuditLog(
        user_id=user.id,
        user_email=user.email,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id else None,
        entity_name=entity_name,
        description=description,
        changes=changes,
        ip_address=ip_address,
        module=module,
    )
    db.add(entry)
    await db.flush()
    return entry


@router.get("")
async def list_audit_logs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    action: Optional[str] = None,
    entity_type: Optional[str] = None,
    module: Optional[str] = None,
    user_email: Optional[str] = None,
    search: Optional[str] = Query(None, max_length=100),
):
    """Lista el audit log con filtros. Solo admin."""
    query = select(AuditLog)

    if action:
        query = query.where(AuditLog.action == action)
    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)
    if module:
        query = query.where(AuditLog.module == module)
    if user_email:
        query = query.where(AuditLog.user_email.ilike(f"%{user_email}%"))
    if search:
        query = query.where(
            AuditLog.description.ilike(f"%{search}%") |
            AuditLog.entity_name.ilike(f"%{search}%") |
            AuditLog.user_email.ilike(f"%{search}%")
        )

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    result = await db.execute(count_query)
    total = result.scalar()

    # Paginate
    query = query.order_by(desc(AuditLog.created_at))
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    items = result.scalars().all()

    return {
        "items": [AuditLogResponse.model_validate(item) for item in items],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size,
    }


@router.get("/stats")
async def audit_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Estadísticas del audit log."""
    # Total entries
    result = await db.execute(select(func.count(AuditLog.id)))
    total = result.scalar()

    # By action
    result = await db.execute(
        select(AuditLog.action, func.count(AuditLog.id))
        .group_by(AuditLog.action)
    )
    by_action = {str(row[0]): row[1] for row in result.all()}

    # By entity type
    result = await db.execute(
        select(AuditLog.entity_type, func.count(AuditLog.id))
        .group_by(AuditLog.entity_type)
    )
    by_entity = {str(row[0]): row[1] for row in result.all()}

    # By module
    result = await db.execute(
        select(AuditLog.module, func.count(AuditLog.id))
        .group_by(AuditLog.module)
    )
    by_module = {str(row[0]): row[1] for row in result.all()}

    # Top users
    result = await db.execute(
        select(AuditLog.user_email, func.count(AuditLog.id))
        .group_by(AuditLog.user_email)
        .order_by(desc(func.count(AuditLog.id)))
        .limit(10)
    )
    top_users = [{"email": row[0], "count": row[1]} for row in result.all()]

    return {
        "total": total,
        "by_action": by_action,
        "by_entity": by_entity,
        "by_module": by_module,
        "top_users": top_users,
    }
