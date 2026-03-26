from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.tenant import get_org_id
from app.models import AccountPlan
from app.schemas import AccountPlanCreate, AccountPlanResponse

router = APIRouter()


@router.get("/lead/{lead_id}", response_model=AccountPlanResponse)
async def get_account_plan(
    lead_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    org_id: str = Depends(get_org_id),
):
    result = await db.execute(select(AccountPlan).where(AccountPlan.lead_id == lead_id))
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Account plan not found")
    return AccountPlanResponse.model_validate(plan)


@router.post("/", response_model=AccountPlanResponse, status_code=201)
async def create_account_plan(
    data: AccountPlanCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    # Check if plan already exists
    existing = await db.execute(select(AccountPlan).where(AccountPlan.lead_id == data.lead_id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Account plan already exists for this lead")
    
    plan = AccountPlan(**data.model_dump())
    db.add(plan)
    await db.commit()
    await db.refresh(plan)
    return AccountPlanResponse.model_validate(plan)


@router.put("/{plan_id}", response_model=AccountPlanResponse)
async def update_account_plan(
    plan_id: UUID,
    data: AccountPlanCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    result = await db.execute(select(AccountPlan).where(AccountPlan.id == plan_id))
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Account plan not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        if key != "lead_id":
            setattr(plan, key, value)
    await db.commit()
    await db.refresh(plan)
    return AccountPlanResponse.model_validate(plan)
