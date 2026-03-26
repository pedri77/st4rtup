"""Multi-tenant middleware — resolves current organization from JWT user."""
import logging
from fastapi import Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user

logger = logging.getLogger(__name__)

# Cache org lookups in memory (user_id → org_id)
_org_cache = {}


async def get_current_org(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Resolve the organization for the current user. Returns org dict with id, plan, etc."""
    user_id = current_user.get("user_id", "")

    # Check cache first
    if user_id in _org_cache:
        return _org_cache[user_id]

    # Query org_members to find user's org
    from app.models.organization import OrgMember, Organization
    result = await db.execute(
        select(Organization)
        .join(OrgMember, OrgMember.org_id == Organization.id)
        .where(OrgMember.user_id == user_id)
        .limit(1)
    )
    org = result.scalar_one_or_none()

    if not org:
        # Auto-create org for new users (first login)
        org = Organization(
            name=current_user.get("email", "").split("@")[0],
            slug=user_id[:8],
            plan="starter",
            max_users=1,
            max_leads=100,
        )
        db.add(org)
        await db.flush()
        member = OrgMember(org_id=org.id, user_id=user_id, role="owner")
        db.add(member)
        await db.commit()
        await db.refresh(org)
        logger.info(f"Auto-created org for user {user_id}: {org.id}")

    org_dict = {
        "org_id": str(org.id),
        "name": org.name,
        "slug": org.slug,
        "plan": org.plan or "starter",
        "max_users": org.max_users or 1,
        "max_leads": org.max_leads or 100,
        "is_active": org.is_active,
    }

    # Cache for 5 min (cleared on restart)
    _org_cache[user_id] = org_dict
    return org_dict


async def get_org_id(org: dict = Depends(get_current_org)) -> str:
    """Shortcut to get just the org_id string."""
    return org["org_id"]


def clear_org_cache(user_id: str = None):
    """Clear org cache (call after plan change, org update, etc.)"""
    if user_id:
        _org_cache.pop(user_id, None)
    else:
        _org_cache.clear()
