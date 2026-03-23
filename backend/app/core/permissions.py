"""Role-based permission dependencies."""
from fastapi import Depends, HTTPException, status
from sqlalchemy import select

from app.core.security import get_current_user
from app.models.lead import Lead


async def require_write_access(
    current_user: dict = Depends(get_current_user),
) -> dict:
    """Deny write operations to viewer role."""
    if current_user.get("role") == "viewer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Viewer role has read-only access",
        )
    return current_user


def apply_lead_row_filter(query, current_user: dict, lead_id_column):
    """Filtra entidades vinculadas a leads según rol del usuario.

    Admin ve todo; otros roles solo ven entidades de leads asignados a ellos.
    `lead_id_column` es la columna FK al lead (ej: Visit.lead_id).
    """
    role = current_user.get("role", "viewer")
    if role == "admin":
        return query
    email = current_user.get("email", "")
    allowed_leads = select(Lead.id).where(Lead.assigned_to == email)
    return query.where(lead_id_column.in_(allowed_leads))
