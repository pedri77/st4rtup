"""Competitive Intelligence endpoints."""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.permissions import require_write_access
from app.models.competitor import Competitor

router = APIRouter()


class CompetitorCreate(BaseModel):
    name: str
    price_range: str = ""
    nis2_support: str = "✗"
    dora_support: str = "✗"
    auto_evidence: str = "✗"
    ux_midmarket: str = "✗"
    differentiators: str = ""
    strengths: list[str] = []
    weaknesses: list[str] = []
    battle_card_md: str = ""
    website: str = ""


@router.get("/")
async def list_competitors(
    region: str = None,
    tier: str = None,
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    q = select(Competitor).order_by(Competitor.name)
    if region:
        q = q.where(Competitor.region == region)
    if tier:
        q = q.where(Competitor.tier == tier)
    result = await db.execute(q)
    return {"competitors": [
        {
            "id": str(c.id), "name": c.name, "region": c.region or "global",
            "tier": c.tier or "medium", "scope": c.scope or "", "model": c.model or "",
            "maturity_score": c.maturity_score or 50,
            "price_range": c.price_range, "website": c.website or "",
            "nis2_support": c.nis2_support, "dora_support": c.dora_support,
            "auto_evidence": c.auto_evidence, "ux_midmarket": c.ux_midmarket,
            "differentiators": c.differentiators, "analysis": c.analysis or "",
            "weakness": c.weakness or "", "vs_st4rtup": c.vs_st4rtup or "",
            "strengths": c.strengths or [], "weaknesses": c.weaknesses or [],
            "tags": c.tags or [], "is_active": c.is_active if c.is_active is not None else True,
        }
        for c in result.scalars().all()
    ]}


@router.get("/stats")
async def competitor_stats(
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    """Win/loss rate por competidor, deals activos."""
    from app.models.pipeline import Opportunity
    from app.models.enums import OpportunityStage
    from sqlalchemy import func, case

    q = select(
        Opportunity.competitor,
        func.count(Opportunity.id).label("total"),
        func.sum(case((Opportunity.stage == OpportunityStage.CLOSED_WON, 1), else_=0)).label("won"),
        func.sum(case((Opportunity.stage == OpportunityStage.CLOSED_LOST, 1), else_=0)).label("lost"),
        func.coalesce(func.sum(Opportunity.value), 0).label("pipeline_value"),
    ).where(Opportunity.competitor.isnot(None)).group_by(Opportunity.competitor)

    result = (await db.execute(q)).all()

    return {
        "by_competitor": [
            {
                "name": r[0], "total_deals": r[1], "won": int(r[2] or 0), "lost": int(r[3] or 0),
                "win_rate": round(int(r[2] or 0) / r[1] * 100, 1) if r[1] > 0 else 0,
                "pipeline_value": round(float(r[4]), 2),
                "active": r[1] - int(r[2] or 0) - int(r[3] or 0),
            }
            for r in result
        ]
    }


@router.get("/{competitor_id}")
async def get_competitor(competitor_id: UUID, db: AsyncSession = Depends(get_db), _current_user: dict = Depends(get_current_user)):
    result = await db.execute(select(Competitor).where(Competitor.id == competitor_id))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Competidor no encontrado")
    return {
        "id": str(c.id), "name": c.name, "price_range": c.price_range,
        "nis2_support": c.nis2_support, "dora_support": c.dora_support,
        "auto_evidence": c.auto_evidence, "ux_midmarket": c.ux_midmarket,
        "differentiators": c.differentiators, "strengths": c.strengths or [],
        "weaknesses": c.weaknesses or [], "battle_card_md": c.battle_card_md or "",
    }


@router.post("/", status_code=201)
async def create_competitor(data: CompetitorCreate, db: AsyncSession = Depends(get_db), _current_user: dict = Depends(require_write_access)):
    comp = Competitor(**data.model_dump())
    db.add(comp)
    await db.commit()
    return {"created": True, "id": str(comp.id)}


@router.put("/{competitor_id}")
async def update_competitor(competitor_id: UUID, data: CompetitorCreate, db: AsyncSession = Depends(get_db), _current_user: dict = Depends(require_write_access)):
    result = await db.execute(select(Competitor).where(Competitor.id == competitor_id))
    comp = result.scalar_one_or_none()
    if not comp:
        raise HTTPException(status_code=404, detail="Competidor no encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(comp, field, value)
    await db.commit()
    return {"updated": True}


@router.get("/{competitor_id}/battle-card/pdf")
async def export_battle_card_pdf(competitor_id: UUID, db: AsyncSession = Depends(get_db), _current_user: dict = Depends(get_current_user)):
    """Exporta battle card como PDF."""
    result = await db.execute(select(Competitor).where(Competitor.id == competitor_id))
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Competidor no encontrado")
    if not c.battle_card_md:
        raise HTTPException(status_code=400, detail="Battle card vacía")

    from app.services.pdf_service import markdown_to_pdf
    pdf = markdown_to_pdf(c.battle_card_md, f"Battle Card — {c.name}")
    return Response(content=pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="battlecard_{c.name}.pdf"'})


@router.post("/seed")
async def seed_competitors(db: AsyncSession = Depends(get_db), _current_user: dict = Depends(require_write_access)):
    """Precarga los 18 competidores del análisis competitivo GTM."""
    from app.data.competitors_seed import COMPETITORS_SEED
    created = 0
    for d in COMPETITORS_SEED:
        existing = await db.scalar(select(Competitor).where(Competitor.name == d["name"]))
        if not existing:
            db.add(Competitor(**d))
            created += 1
    await db.commit()
    return {"seeded": created, "total": len(COMPETITORS_SEED)}
