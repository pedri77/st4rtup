"""Organization management endpoints."""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.tenant import get_current_org, clear_org_cache
from app.models.organization import Organization, OrgMember

router = APIRouter()


@router.get("/me")
async def get_my_org(org: dict = Depends(get_current_org)):
    """Get current user's organization."""
    return org


@router.put("/me")
async def update_my_org(
    name: str = Query(None),
    sector: str = Query(None),
    logo_url: str = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    org: dict = Depends(get_current_org),
):
    """Update current organization."""
    db_org = await db.get(Organization, org["org_id"])
    if not db_org:
        raise HTTPException(404)
    if name:
        db_org.name = name
    if sector:
        db_org.sector = sector
    if logo_url is not None:
        db_org.logo_url = logo_url
    await db.commit()
    clear_org_cache(current_user.get("user_id"))
    return {"updated": True}


@router.get("/members")
async def list_members(
    db: AsyncSession = Depends(get_db),
    org: dict = Depends(get_current_org),
):
    """List members of current organization."""
    from app.models.user import User
    result = await db.execute(
        select(OrgMember, User)
        .join(User, User.id == OrgMember.user_id)
        .where(OrgMember.org_id == org["org_id"])
    )
    members = []
    for member, user in result.all():
        members.append({
            "id": str(member.id),
            "user_id": str(member.user_id),
            "email": user.email,
            "full_name": user.full_name,
            "role": member.role,
            "created_at": member.created_at.isoformat() if member.created_at else None,
        })
    return {"items": members, "total": len(members), "max_users": org["max_users"]}


@router.get("/plan")
async def get_plan(org: dict = Depends(get_current_org)):
    """Get current plan details."""
    PLAN_LIMITS = {
        "starter": {"users": 1, "leads": 100, "price": 0},
        "growth": {"users": 3, "leads": 5000, "price": 19},
        "scale": {"users": 10, "leads": 999999, "price": 49},
        "enterprise": {"users": 999, "leads": 999999, "price": 0},
    }
    plan = org.get("plan", "starter")
    limits = PLAN_LIMITS.get(plan, PLAN_LIMITS["starter"])
    return {
        "plan": plan,
        "limits": limits,
        "org_name": org["name"],
        "is_active": org["is_active"],
    }
