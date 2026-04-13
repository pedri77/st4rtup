from typing import Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.security import get_current_user, get_current_admin_user
from app.core.tenant import get_current_org
from app.core.config import settings
from app.models.models import User, UserRole
from app.schemas import UserCreate, UserUpdate, UserResponse, UserListItem, PaginatedResponse

router = APIRouter()


@router.get("/me/profile", response_model=UserResponse)
async def get_my_profile(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Get current user's profile."""
    user_id = UUID(current_user["user_id"])
    email = current_user.get("email")

    # 1. Search by auth UUID
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    # 2. Fallback: search by email (handles ID mismatch after Supabase re-creation)
    if not user and email:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user:
            # Sync the ID to match current auth UUID
            user.id = user_id
            await db.commit()
            await db.refresh(user)

    # 3. Only create new record if neither ID nor email matches
    if not user:
        # New users get VIEWER role by default. Admin must be assigned explicitly
        # via PUT /users/{id} by an existing admin.
        role = UserRole.VIEWER
        user = User(
            id=user_id,
            email=email,
            role=role,
            is_active=True,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    # Update last_login_at
    user.last_login_at = datetime.now(timezone.utc)
    await db.commit()

    return UserResponse.model_validate(user)


# ─── Onboarding state ──────────────────────────────────────────

@router.get("/me/onboarding")
async def get_my_onboarding(
    db: AsyncSession = Depends(get_db),
    org: dict = Depends(get_current_org),
):
    """Devuelve el estado de onboarding de la org del usuario."""
    from app.models.organization import Organization

    result = await db.execute(select(Organization).where(Organization.id == UUID(org["org_id"])))
    organization = result.scalar_one_or_none()
    if not organization:
        return {"completed": False, "data": {}}

    return {
        "completed": bool(getattr(organization, "onboarding_completed", False)),
        "data": getattr(organization, "onboarding_data", {}) or {},
    }


@router.post("/me/onboarding")
async def set_my_onboarding(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    org: dict = Depends(get_current_org),
):
    """Marca el onboarding como completado y persiste los datos del wizard."""
    from app.models.organization import Organization

    result = await db.execute(select(Organization).where(Organization.id == UUID(org["org_id"])))
    organization = result.scalar_one_or_none()
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")

    organization.onboarding_completed = bool(payload.get("completed", True))
    organization.onboarding_data = payload.get("data", {}) or {}
    await db.commit()

    return {"completed": organization.onboarding_completed, "data": organization.onboarding_data}


# ─── Setup checklist (post-onboarding) ────────────────────────────

@router.get("/me/setup-checklist")
async def get_setup_checklist(
    db: AsyncSession = Depends(get_db),
    org: dict = Depends(get_current_org),
):
    """Devuelve el estado del setup checklist de la org."""
    from app.models.organization import Organization

    result = await db.execute(select(Organization).where(Organization.id == UUID(org["org_id"])))
    organization = result.scalar_one_or_none()
    if not organization:
        return {"dismissed": False, "completed": []}

    checklist = getattr(organization, "setup_checklist", None) or {"dismissed": False, "completed": []}
    return checklist


@router.put("/me/setup-checklist")
async def update_setup_checklist(
    payload: dict,
    db: AsyncSession = Depends(get_db),
    org: dict = Depends(get_current_org),
):
    """Actualiza el estado del setup checklist."""
    from app.models.organization import Organization

    result = await db.execute(select(Organization).where(Organization.id == UUID(org["org_id"])))
    organization = result.scalar_one_or_none()
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")

    current = getattr(organization, "setup_checklist", None) or {"dismissed": False, "completed": []}

    if "dismissed" in payload:
        current["dismissed"] = bool(payload["dismissed"])
    if "completed" in payload:
        current["completed"] = list(set(current.get("completed", []) + payload["completed"]))

    organization.setup_checklist = current
    await db.commit()

    return current


@router.get("", response_model=PaginatedResponse)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    role: Optional[UserRole] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = Query(None, max_length=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_admin_user),  # Only admins can list users
):
    """
    List all users with filtering and pagination.
    Admin only endpoint.
    """
    query = select(User)

    # Filters
    if role:
        query = query.where(User.role == role)
    if is_active is not None:
        query = query.where(User.is_active == is_active)
    if search:
        query = query.where(
            User.email.ilike(f"%{search}%") |
            User.full_name.ilike(f"%{search}%")
        )

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()

    # Sort by created_at desc
    query = query.order_by(User.created_at.desc())

    # Paginate
    query = query.offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    users = result.scalars().all()

    return PaginatedResponse(
        items=[UserListItem.model_validate(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
        pages=(total + page_size - 1) // page_size,
    )


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Get user details.
    Users can see their own profile. Admins can see anyone.
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check permissions: own profile or admin
    current_user_id = UUID(current_user["user_id"])
    if user.id != current_user_id:
        # Check if current user is admin
        current_user_obj = await db.execute(
            select(User).where(User.id == current_user_id)
        )
        current = current_user_obj.scalar_one_or_none()
        if not current or current.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=403,
                detail="You can only view your own profile"
            )

    return UserResponse.model_validate(user)


@router.post("", response_model=UserResponse, status_code=201)
async def create_user(
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_admin_user),  # Only admins can create users
):
    """
    Create (invite) a new user.
    Sends invitation email via Supabase Auth.
    Admin only endpoint.
    """
    # Check if user already exists
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="User with this email already exists")

    # Create user in our database
    user_data = data.model_dump()
    user = User(
        **user_data,
        invited_at=datetime.now(),
        invited_by=UUID(current_user["user_id"]),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Invite user via Supabase Admin API (graceful degradation if service role key not configured)
    try:
        if hasattr(settings, 'SUPABASE_SERVICE_ROLE_KEY') and settings.SUPABASE_SERVICE_ROLE_KEY:
            from supabase import create_client
            admin_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
            admin_client.auth.admin.invite_user_by_email(data.email)
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(
            f"Could not send Supabase invite to {data.email}: {e}. "
            "User created in DB but must be manually invited to Supabase Auth."
        )

    return UserResponse.model_validate(user)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """
    Update user.
    Users can update their own profile (limited fields).
    Admins can update anyone.
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check permissions
    current_user_id = UUID(current_user["user_id"])
    is_own_profile = user.id == current_user_id

    # Get current user's role
    current_user_obj = await db.execute(
        select(User).where(User.id == current_user_id)
    )
    current = current_user_obj.scalar_one_or_none()
    is_admin = current and current.role == UserRole.ADMIN

    if not is_own_profile and not is_admin:
        raise HTTPException(
            status_code=403,
            detail="You can only update your own profile"
        )

    # If not admin, restrict which fields can be updated
    update_data = data.model_dump(exclude_unset=True)
    if not is_admin:
        # Non-admins can only update their own profile info, not role or is_active
        forbidden_fields = {"role", "is_active"}
        if any(field in update_data for field in forbidden_fields):
            raise HTTPException(
                status_code=403,
                detail="You don't have permission to update role or active status"
            )

    # Apply updates
    for key, value in update_data.items():
        setattr(user, key, value)

    await db.commit()
    await db.refresh(user)

    return UserResponse.model_validate(user)


@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_admin_user),  # Only admins can delete users
):
    """
    Delete a user.
    Admin only endpoint.
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent self-deletion
    current_user_id = UUID(current_user["user_id"])
    if user.id == current_user_id:
        raise HTTPException(
            status_code=400,
            detail="You cannot delete your own account"
        )

    await db.delete(user)
    await db.commit()
