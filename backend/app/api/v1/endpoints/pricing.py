"""Pricing Engine endpoints."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.tenant import get_org_id
from app.core.security import get_current_user
from app.core.permissions import require_write_access
from app.models.pricing import PricingTier

router = APIRouter()


class PricingTierCreate(BaseModel):
    name: str
    slug: str
    description: str = ""
    base_price: float
    price_unit: str = "year"
    duration_days: Optional[int] = None
    min_price: Optional[float] = None
    max_price: Optional[float] = None
    modules_included: list[str] = []
    modules_available: list[str] = []
    infra_cost_monthly: float = 0
    sort_order: int = 0


@router.get("/")
async def list_tiers(
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
org_id: str = Depends(get_org_id),
):
    """Lista todos los tiers de pricing."""
    result = await db.execute(select(PricingTier).where(PricingTier.is_active == True).order_by(PricingTier.sort_order))  # noqa: E712
    tiers = result.scalars().all()
    return {"tiers": [
        {
            "id": str(t.id), "name": t.name, "slug": t.slug, "description": t.description,
            "base_price": t.base_price, "price_unit": t.price_unit, "duration_days": t.duration_days,
            "min_price": t.min_price, "max_price": t.max_price,
            "modules_included": t.modules_included or [], "modules_available": t.modules_available or [],
            "infra_cost_monthly": t.infra_cost_monthly, "sort_order": t.sort_order,
        }
        for t in tiers
    ]}


@router.post("/", status_code=201)
async def create_tier(
    data: PricingTierCreate,
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_write_access),
org_id: str = Depends(get_org_id),
):
    """Crea un tier de pricing."""
    tier = PricingTier(**data.model_dump())
    db.add(tier)
    await db.commit()
    return {"created": True, "id": str(tier.id)}


@router.get("/calculate")
async def calculate_price(
    tier_slug: str,
    modules: str = "",
    duration_months: int = 12,
    discount_pct: float = 0,
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
org_id: str = Depends(get_org_id),
):
    """Calcula precio para un deal según tier, módulos y descuento."""
    result = await db.execute(select(PricingTier).where(PricingTier.slug == tier_slug))
    tier = result.scalar_one_or_none()
    if not tier:
        raise HTTPException(status_code=404, detail="Tier no encontrado")

    selected_modules = [m.strip() for m in modules.split(",") if m.strip()] if modules else []

    # Base price
    if tier.price_unit == "fixed":
        total = tier.base_price
    elif tier.price_unit == "month":
        total = tier.base_price * duration_months
    else:
        total = tier.base_price * (duration_months / 12)

    # Module surcharges (10% per extra module)
    extra_modules = [m for m in selected_modules if m not in (tier.modules_included or [])]
    module_surcharge = total * 0.10 * len(extra_modules)
    total += module_surcharge

    # Discount
    discount_amount = total * (discount_pct / 100)
    final_price = total - discount_amount

    # Margin
    infra_cost = tier.infra_cost_monthly * duration_months
    gross_margin = final_price - infra_cost
    margin_pct = (gross_margin / final_price * 100) if final_price > 0 else 0

    return {
        "tier": tier.name,
        "base_price": tier.base_price,
        "duration_months": duration_months,
        "modules": selected_modules,
        "extra_modules": extra_modules,
        "module_surcharge": round(module_surcharge, 2),
        "subtotal": round(total, 2),
        "discount_pct": discount_pct,
        "discount_amount": round(discount_amount, 2),
        "final_price": round(final_price, 2),
        "infra_cost": round(infra_cost, 2),
        "gross_margin": round(gross_margin, 2),
        "margin_pct": round(margin_pct, 1),
    }


@router.get("/stats")
async def pricing_stats(
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
org_id: str = Depends(get_org_id),
):
    """Stats de pricing: deals por tier, revenue, margen medio."""
    from app.models.pipeline import Opportunity
    from app.models.enums import OpportunityStage
    from sqlalchemy import func, case

    # Deals by tier
    tier_q = select(
        Opportunity.pricing_tier,
        func.count(Opportunity.id).label("deals"),
        func.coalesce(func.sum(Opportunity.value), 0).label("revenue"),
        func.coalesce(func.avg(Opportunity.pricing_margin_pct), 0).label("avg_margin"),
        func.sum(case((Opportunity.stage == OpportunityStage.CLOSED_WON, 1), else_=0)).label("won"),
    ).where(Opportunity.pricing_tier.isnot(None)).group_by(Opportunity.pricing_tier)
    result = (await db.execute(tier_q)).all()

    tiers_stats = [
        {
            "tier": r[0], "deals": r[1], "revenue": round(float(r[2]), 2),
            "avg_margin": round(float(r[3]), 1), "won": int(r[4] or 0),
            "win_rate": round(int(r[4] or 0) / r[1] * 100, 1) if r[1] > 0 else 0,
        }
        for r in result
    ]

    # Totals
    total_deals = sum(t["deals"] for t in tiers_stats)
    total_revenue = sum(t["revenue"] for t in tiers_stats)
    total_won = sum(t["won"] for t in tiers_stats)

    # Deals without tier assigned
    no_tier = await db.scalar(
        select(func.count()).select_from(Opportunity).where(Opportunity.pricing_tier.is_(None))
    ) or 0

    return {
        "by_tier": tiers_stats,
        "total_deals_with_tier": total_deals,
        "total_revenue": total_revenue,
        "total_won": total_won,
        "deals_without_tier": no_tier,
    }


@router.post("/seed")
async def seed_tiers(
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_write_access),
org_id: str = Depends(get_org_id),
):
    """Precarga los 3 tiers base del GTM."""
    defaults = [
        {
            "name": "Pilot PoC", "slug": "pilot_poc", "base_price": 19500, "price_unit": "fixed",
            "duration_days": 90, "min_price": 19500, "max_price": 19500,
            "description": "PoC de 90 días con módulo Enterprise + soporte dedicado",
            "modules_included": ["grc_core", "ens_alto"], "modules_available": ["nis2", "dora", "soc"],
            "infra_cost_monthly": 1200, "sort_order": 1,
        },
        {
            "name": "Enterprise", "slug": "enterprise", "base_price": 60000, "price_unit": "year",
            "min_price": 48000, "max_price": 72000,
            "description": "Licencia anual enterprise con módulos a medida",
            "modules_included": ["grc_core", "ens_alto", "nis2"], "modules_available": ["dora", "iso27001", "soc", "de", "ai_act"],
            "infra_cost_monthly": 2000, "sort_order": 2,
        },
        {
            "name": "SMB", "slug": "smb", "base_price": 1200, "price_unit": "month",
            "min_price": 1200, "max_price": 3000,
            "description": "Self-service desde €1.200/mes para pymes",
            "modules_included": ["grc_core"], "modules_available": ["ens_alto", "nis2", "dora"],
            "infra_cost_monthly": 800, "sort_order": 3,
        },
    ]

    created = 0
    for d in defaults:
        existing = await db.scalar(select(PricingTier).where(PricingTier.slug == d["slug"]))
        if not existing:
            db.add(PricingTier(**d))
            created += 1

    await db.commit()
    return {"seeded": created}
