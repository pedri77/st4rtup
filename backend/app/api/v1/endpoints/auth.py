"""Auth endpoints — registration and provisioning."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.organization import Organization, OrgMember

import logging
logger = logging.getLogger(__name__)

router = APIRouter()


class RegisterRequest(BaseModel):
    full_name: str = ""
    company_name: str = ""


@router.post("/register")
async def register_user(
    req: RegisterRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Provision user + org after Supabase signup.
    Called by frontend right after supabase.auth.signUp().
    The JWT is already valid at this point.
    """
    user_id = UUID(current_user["user_id"])
    email = current_user.get("email", "")

    # Check if user already exists in DB
    existing = await db.execute(select(User).where(User.id == user_id))
    if existing.scalar_one_or_none():
        return {"status": "already_exists", "message": "User already provisioned"}

    # Create organization
    slug = (req.company_name or email.split("@")[0]).lower().replace(" ", "-")[:100]
    # Ensure unique slug
    slug_check = await db.execute(select(Organization).where(Organization.slug == slug))
    if slug_check.scalar_one_or_none():
        slug = f"{slug}-{str(user_id)[:8]}"

    org = Organization(
        name=req.company_name or f"Org de {req.full_name}",
        slug=slug,
        plan="starter",
        max_users=1,
        max_leads=100,
        is_active=True,
    )
    db.add(org)
    await db.flush()

    # Create user record
    user = User(
        id=user_id,
        email=email,
        full_name=req.full_name,
        role="admin",
        is_active=True,
    )
    db.add(user)
    await db.flush()

    # Create org membership
    member = OrgMember(
        org_id=org.id,
        user_id=user_id,
        role="admin",
    )
    db.add(member)

    await db.commit()
    logger.info(f"Provisioned user={email} org={org.slug} plan=starter")

    # Send welcome email (fire-and-forget)
    try:
        from app.services.email_service import EmailService
        email_svc = EmailService(db)
        await email_svc.send_welcome_email(email, req.full_name)
    except Exception as e:
        logger.warning(f"Welcome email failed for {email}: {e}")

    return {
        "status": "created",
        "org_id": str(org.id),
        "org_slug": org.slug,
        "plan": "starter",
    }
