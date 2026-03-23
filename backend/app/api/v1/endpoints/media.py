"""Digital Marketing Trifecta — Paid, Earned, Owned Media endpoints."""
from typing import Optional
from uuid import UUID
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.permissions import require_write_access
from app.models.media import AdCampaign, EarnedMention
from app.models.lead import Lead

router = APIRouter()


# ═══════════════════════════════════════════════════════════════
# PAID MEDIA — Ad Campaigns
# ═══════════════════════════════════════════════════════════════

class AdCampaignCreate(BaseModel):
    name: str
    platform: str
    objective: str = ""
    target_audience: str = ""
    placement: str = ""
    targeting: str = ""
    ad_format: str = ""
    buying_model: str = "CPC"
    unit_cost: float = 0
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    budget_total: float = 0
    budget_daily: float = 0


class AdCampaignUpdate(BaseModel):
    status: Optional[str] = None
    spend_total: Optional[float] = None
    impressions: Optional[int] = None
    clicks: Optional[int] = None
    conversions: Optional[int] = None
    leads_generated: Optional[int] = None
    notes: Optional[str] = None


@router.get("/paid/campaigns")
async def list_ad_campaigns(
    platform: Optional[str] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    q = select(AdCampaign).order_by(desc(AdCampaign.created_at))
    if platform:
        q = q.where(AdCampaign.platform == platform)
    if status:
        q = q.where(AdCampaign.status == status)
    result = await db.execute(q)
    campaigns = result.scalars().all()
    return {"campaigns": [
        {
            "id": str(c.id), "name": c.name, "platform": c.platform, "status": c.status,
            "objective": c.objective, "budget_total": c.budget_total, "spend_total": c.spend_total,
            "impressions": c.impressions, "clicks": c.clicks, "conversions": c.conversions,
            "leads_generated": c.leads_generated, "ctr": c.ctr, "cpc": c.cpc, "cpl": c.cpl, "roas": c.roas,
            "placement": c.placement, "targeting": c.targeting, "ad_format": c.ad_format,
            "buying_model": c.buying_model, "unit_cost": c.unit_cost,
            "start_date": str(c.start_date) if c.start_date else None,
            "end_date": str(c.end_date) if c.end_date else None,
        }
        for c in campaigns
    ]}


@router.post("/paid/campaigns", status_code=201)
async def create_ad_campaign(
    data: AdCampaignCreate,
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_write_access),
):
    campaign = AdCampaign(**data.model_dump())
    db.add(campaign)
    await db.commit()
    return {"created": True, "id": str(campaign.id)}


@router.put("/paid/campaigns/{campaign_id}")
async def update_ad_campaign(
    campaign_id: UUID,
    data: AdCampaignUpdate,
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_write_access),
):
    result = await db.execute(select(AdCampaign).where(AdCampaign.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaña no encontrada")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(campaign, field, value)

    # Auto-calculate metrics
    if campaign.clicks and campaign.impressions:
        campaign.ctr = round(campaign.clicks / campaign.impressions * 100, 2)
    if campaign.spend_total and campaign.clicks:
        campaign.cpc = round(campaign.spend_total / campaign.clicks, 2)
    if campaign.spend_total and campaign.leads_generated:
        campaign.cpl = round(campaign.spend_total / campaign.leads_generated, 2)
    if campaign.spend_total and campaign.conversions:
        campaign.cpa = round(campaign.spend_total / campaign.conversions, 2)

    await db.commit()
    return {"updated": True}


@router.get("/paid/stats")
async def paid_media_stats(
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    """Stats agregados de Paid Media."""
    q = select(
        func.coalesce(func.sum(AdCampaign.spend_total), 0),
        func.coalesce(func.sum(AdCampaign.impressions), 0),
        func.coalesce(func.sum(AdCampaign.clicks), 0),
        func.coalesce(func.sum(AdCampaign.leads_generated), 0),
        func.coalesce(func.sum(AdCampaign.conversions), 0),
        func.count(AdCampaign.id),
    )
    result = (await db.execute(q)).one()

    total_spend = float(result[0])
    total_leads = int(result[3])
    avg_cpl = round(total_spend / total_leads, 2) if total_leads > 0 else 0

    # By platform
    platform_q = select(
        AdCampaign.platform,
        func.sum(AdCampaign.spend_total),
        func.sum(AdCampaign.leads_generated),
        func.sum(AdCampaign.clicks),
    ).group_by(AdCampaign.platform)
    platform_result = (await db.execute(platform_q)).all()

    return {
        "total_spend": round(total_spend, 2),
        "total_impressions": int(result[1]),
        "total_clicks": int(result[2]),
        "total_leads": total_leads,
        "total_conversions": int(result[4]),
        "total_campaigns": result[5],
        "avg_cpl": avg_cpl,
        "by_platform": [
            {"platform": r[0], "spend": round(float(r[1] or 0), 2), "leads": int(r[2] or 0), "clicks": int(r[3] or 0)}
            for r in platform_result
        ],
    }


# ═══════════════════════════════════════════════════════════════
# EARNED MEDIA — Mentions, Reviews, PR
# ═══════════════════════════════════════════════════════════════

class MentionCreate(BaseModel):
    type: str  # review, press, social_mention, backlink, award
    platform: str = ""
    title: str = ""
    url: str = ""
    author: str = ""
    content_snippet: str = ""
    sentiment: str = "positive"
    rating: Optional[float] = None
    reach: int = 0
    date_published: Optional[date] = None


@router.get("/earned/mentions")
async def list_mentions(
    type: Optional[str] = None,
    platform: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    q = select(EarnedMention).order_by(desc(EarnedMention.created_at))
    if type:
        q = q.where(EarnedMention.type == type)
    if platform:
        q = q.where(EarnedMention.platform == platform)
    result = await db.execute(q)
    return {"mentions": [
        {
            "id": str(m.id), "type": m.type, "platform": m.platform, "title": m.title,
            "url": m.url, "author": m.author, "sentiment": m.sentiment, "rating": m.rating,
            "reach": m.reach, "engagement": m.engagement,
            "date_published": str(m.date_published) if m.date_published else None,
        }
        for m in result.scalars().all()
    ]}


@router.post("/earned/mentions", status_code=201)
async def create_mention(
    data: MentionCreate,
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_write_access),
):
    mention = EarnedMention(**data.model_dump())
    db.add(mention)
    await db.commit()
    return {"created": True, "id": str(mention.id)}


@router.get("/earned/stats")
async def earned_media_stats(
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    """Stats agregados de Earned Media."""
    total = await db.scalar(select(func.count()).select_from(EarnedMention)) or 0
    avg_rating = await db.scalar(
        select(func.avg(EarnedMention.rating)).where(EarnedMention.rating.isnot(None))
    ) or 0
    total_reach = await db.scalar(select(func.coalesce(func.sum(EarnedMention.reach), 0))) or 0

    # By type
    type_q = select(EarnedMention.type, func.count(EarnedMention.id)).group_by(EarnedMention.type)
    type_result = (await db.execute(type_q)).all()

    # By sentiment
    sentiment_q = select(EarnedMention.sentiment, func.count(EarnedMention.id)).group_by(EarnedMention.sentiment)
    sentiment_result = (await db.execute(sentiment_q)).all()

    return {
        "total_mentions": total,
        "avg_rating": round(float(avg_rating), 1),
        "total_reach": int(total_reach),
        "by_type": {r[0]: r[1] for r in type_result},
        "by_sentiment": {r[0]: r[1] for r in sentiment_result},
    }


# ═══════════════════════════════════════════════════════════════
# TRIFECTA — Vista unificada Owned + Earned + Paid
# ═══════════════════════════════════════════════════════════════

@router.post("/paid/seed")
async def seed_ad_campaigns(
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(require_write_access),
):
    """Precarga campañas B2B de ciberseguridad adaptadas a St4rtup."""
    from datetime import date
    defaults = [
        {"name": "LinkedIn Ads — CISOs ENS Alto", "platform": "linkedin_ads", "objective": "lead_gen",
         "target_audience": "CISOs, CTOs, DPOs en España · Empresa >50 empleados · Sector regulado",
         "placement": "Feed + Sponsored InMail", "targeting": "Job Title: CISO, CTO, DPO · Location: Spain · Company Size: 51-1000",
         "ad_format": "Sponsored Content + Message Ads", "buying_model": "CPC",
         "unit_cost": 8.50, "budget_total": 3000, "budget_daily": 50,
         "start_date": date(2026, 4, 1), "end_date": date(2026, 6, 30)},
        {"name": "LinkedIn Ads — NIS2/DORA Awareness", "platform": "linkedin_ads", "objective": "brand_awareness",
         "target_audience": "Decision makers ciberseguridad Europa · Banca, Energía, Salud",
         "placement": "Feed", "targeting": "Seniority: Director+ · Industry: Banking, Energy, Healthcare · EU",
         "ad_format": "Carousel + Video Ad 30s", "buying_model": "CPM",
         "unit_cost": 35.0, "budget_total": 2000, "budget_daily": 30,
         "start_date": date(2026, 4, 1), "end_date": date(2026, 6, 30)},
        {"name": "Google Ads SEM — Keywords ENS NIS2", "platform": "google_ads", "objective": "lead_gen",
         "target_audience": "Búsquedas: 'cumplimiento ENS', 'plataforma NIS2', 'GRC ciberseguridad España'",
         "placement": "Search Network", "targeting": "Keywords: ENS alto, NIS2 software, GRC ciberseguridad, DORA compliance",
         "ad_format": "Responsive Search Ads", "buying_model": "CPC",
         "unit_cost": 4.20, "budget_total": 1500, "budget_daily": 25,
         "start_date": date(2026, 4, 1), "end_date": date(2026, 6, 30)},
        {"name": "YouTube Ads — Webinar NIS2/DORA", "platform": "youtube_ads", "objective": "conversions",
         "target_audience": "Profesionales ciberseguridad · España · Intereses: compliance, GRC",
         "placement": "In-stream skippable + Discovery", "targeting": "Custom Intent: NIS2, DORA, ENS, SOC · Affinity: IT Security",
         "ad_format": "Video 30s skippable", "buying_model": "CPV",
         "unit_cost": 0.05, "budget_total": 800, "budget_daily": 15,
         "start_date": date(2026, 4, 15), "end_date": date(2026, 5, 31)},
        {"name": "Google Display — Retargeting visitantes web", "platform": "google_ads", "objective": "conversions",
         "target_audience": "Visitantes st4rtup.app últimos 30 días",
         "placement": "Display Network — Retargeting", "targeting": "Remarketing list: website visitors · Exclude: customers",
         "ad_format": "Responsive Display Ads", "buying_model": "CPM",
         "unit_cost": 2.50, "budget_total": 500, "budget_daily": 10,
         "start_date": date(2026, 4, 1), "end_date": date(2026, 6, 30)},
    ]
    created = 0
    for d in defaults:
        existing = await db.scalar(select(AdCampaign).where(AdCampaign.name == d["name"]))
        if not existing:
            db.add(AdCampaign(**d))
            created += 1
    await db.commit()
    return {"seeded": created}


@router.get("/trifecta")
async def trifecta_overview(
    db: AsyncSession = Depends(get_db),
    _current_user: dict = Depends(get_current_user),
):
    """Vista unificada del Digital Marketing Trifecta."""
    from app.models.marketing import MarketingAsset, Campaign

    # OWNED: assets, SEO traffic (from internal data)
    total_assets = await db.scalar(select(func.count()).select_from(MarketingAsset)) or 0
    total_campaigns = await db.scalar(select(func.count()).select_from(Campaign)) or 0
    owned_visits = await db.scalar(select(func.coalesce(func.sum(MarketingAsset.visits), 0))) or 0
    owned_conversions = await db.scalar(select(func.coalesce(func.sum(MarketingAsset.conversions), 0))) or 0

    # EARNED
    earned_total = await db.scalar(select(func.count()).select_from(EarnedMention)) or 0
    earned_reach = await db.scalar(select(func.coalesce(func.sum(EarnedMention.reach), 0))) or 0
    earned_avg_rating = await db.scalar(
        select(func.avg(EarnedMention.rating)).where(EarnedMention.rating.isnot(None))
    ) or 0

    # PAID
    paid_spend = await db.scalar(select(func.coalesce(func.sum(AdCampaign.spend_total), 0))) or 0
    paid_leads = await db.scalar(select(func.coalesce(func.sum(AdCampaign.leads_generated), 0))) or 0
    paid_impressions = await db.scalar(select(func.coalesce(func.sum(AdCampaign.impressions), 0))) or 0

    # Total leads by source type
    organic_leads = await db.scalar(
        select(func.count()).select_from(Lead).where(Lead.source.in_(["website", "seo", "blog", "organic"]))
    ) or 0
    paid_source_leads = await db.scalar(
        select(func.count()).select_from(Lead).where(Lead.source.in_(["google_ads", "linkedin_ads", "paid", "ads"]))
    ) or 0
    referral_leads = await db.scalar(
        select(func.count()).select_from(Lead).where(Lead.source.in_(["referral", "partner", "mssp", "event"]))
    ) or 0

    return {
        "owned": {
            "assets": total_assets,
            "campaigns": total_campaigns,
            "visits": int(owned_visits),
            "conversions": int(owned_conversions),
            "leads": organic_leads,
        },
        "earned": {
            "mentions": earned_total,
            "reach": int(earned_reach),
            "avg_rating": round(float(earned_avg_rating), 1),
            "leads": referral_leads,
        },
        "paid": {
            "spend": round(float(paid_spend), 2),
            "impressions": int(paid_impressions),
            "leads": int(paid_leads) or paid_source_leads,
            "cpl": round(float(paid_spend) / max(int(paid_leads) or paid_source_leads, 1), 2),
        },
    }
