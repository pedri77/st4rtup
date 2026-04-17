"""Brand & Positioning endpoints."""
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.tenant import get_org_id
from app.core.security import get_current_user
from app.core.permissions import require_write_access
from app.models.brand import BrandConfig

router = APIRouter()


class BrandConfigUpdate(BaseModel):
    company_name: Optional[str] = None
    domain: Optional[str] = None
    slogan: Optional[str] = None
    mission: Optional[str] = None
    vision: Optional[str] = None
    values: Optional[str] = None
    segment: Optional[str] = None
    regulatory_frameworks: Optional[list[str]] = None
    logo_url: Optional[str] = None
    primary_color: Optional[str] = None
    gtm_budget_annual: Optional[float] = None
    gtm_budget_q1: Optional[float] = None
    gtm_budget_q2: Optional[float] = None
    gtm_budget_q3: Optional[float] = None
    gtm_budget_q4: Optional[float] = None


@router.get("/")
async def get_brand_config(
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
org_id: str = Depends(get_org_id),
):
    """Obtiene la configuración de marca."""
    result = await db.execute(select(BrandConfig).limit(1))
    config = result.scalar_one_or_none()
    if not config:
        config = BrandConfig(
            company_name="St4rtup",
            domain="st4rtup.app",
            segment="enterprise",
            regulatory_frameworks=["Enterprise", "NIS2", "DORA", "SaaS Best Practices", "EU AI Act"],
        )
        db.add(config)
        await db.commit()
        await db.refresh(config)

    return {
        "id": str(config.id),
        "company_name": config.company_name,
        "domain": config.domain,
        "slogan": config.slogan,
        "mission": config.mission,
        "vision": config.vision,
        "values": config.values,
        "segment": config.segment,
        "regulatory_frameworks": config.regulatory_frameworks or [],
        "logo_url": config.logo_url,
        "primary_color": config.primary_color,
        "gtm_budget_annual": config.gtm_budget_annual or 0,
        "gtm_budget_q1": config.gtm_budget_q1 or 0,
        "gtm_budget_q2": config.gtm_budget_q2 or 0,
        "gtm_budget_q3": config.gtm_budget_q3 or 0,
        "gtm_budget_q4": config.gtm_budget_q4 or 0,
    }


@router.put("/")
async def update_brand_config(
    data: BrandConfigUpdate,
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_write_access),
org_id: str = Depends(get_org_id),
):
    """Actualiza la configuración de marca."""
    result = await db.execute(select(BrandConfig).limit(1))
    config = result.scalar_one_or_none()
    if not config:
        config = BrandConfig()
        db.add(config)

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(config, field, value)

    await db.commit()
    return {"updated": True}
