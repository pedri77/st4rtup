"""Digital Marketing Trifecta — Owned, Earned, Paid Media tracking."""

from sqlalchemy import Column, String, Float, Integer, Text, Date, JSON, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import ForeignKey

from app.models.base import BaseModel


class AdCampaign(BaseModel):
    """Paid Media — campañas publicitarias (LinkedIn Ads, Google Ads, etc.)."""
    __tablename__ = "ad_campaigns"

    name = Column(String(255), nullable=False)
    platform = Column(String(50), nullable=False)  # linkedin_ads, google_ads, youtube_ads, meta_ads
    status = Column(String(20), default="active")  # active, paused, completed
    objective = Column(String(100))  # lead_gen, brand_awareness, traffic, conversions
    target_audience = Column(Text)  # CEO, CTO, DPO en España...
    start_date = Column(Date)
    end_date = Column(Date)
    budget_total = Column(Float, default=0)
    budget_daily = Column(Float, default=0)
    spend_total = Column(Float, default=0)
    impressions = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    conversions = Column(Integer, default=0)
    leads_generated = Column(Integer, default=0)
    ctr = Column(Float, default=0)  # Click-through rate %
    cpc = Column(Float, default=0)  # Cost per click
    cpl = Column(Float, default=0)  # Cost per lead
    cpa = Column(Float, default=0)  # Cost per acquisition
    roas = Column(Float, default=0)  # Return on ad spend
    # Media planning fields
    placement = Column(String(255))  # Ubicación: Feed, Stories, Pre-roll, ROS...
    targeting = Column(Text)  # Segmentación: CEOs España, >50 empleados...
    ad_format = Column(String(100))  # Formato: Sponsored Content, Video Ad, Text Ad...
    buying_model = Column(String(10))  # CPM, CPC, CPL, CPA, FIJO
    unit_cost = Column(Float, default=0)  # Coste unitario negociado
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id", ondelete="SET NULL"), nullable=True)
    notes = Column(Text)
    metadata_ = Column("metadata", JSON)


class EarnedMention(BaseModel):
    """Earned Media — menciones, reviews, PR, shares."""
    __tablename__ = "earned_mentions"

    type = Column(String(50), nullable=False)  # review, press, social_mention, backlink, award
    platform = Column(String(100))  # g2, capterra, gartner, linkedin, twitter, media_outlet
    title = Column(String(500))
    url = Column(String(1000))
    author = Column(String(255))
    content_snippet = Column(Text)
    sentiment = Column(String(20))  # positive, neutral, negative
    rating = Column(Float)  # 1-5 for reviews
    reach = Column(Integer, default=0)  # Estimated audience reach
    engagement = Column(Integer, default=0)  # Likes, shares, comments
    is_verified = Column(Boolean, default=False)
    date_published = Column(Date)
    notes = Column(Text)


class MediaMetrics(BaseModel):
    """Métricas agregadas por tipo de media y período."""
    __tablename__ = "media_metrics"

    period = Column(String(10), nullable=False)  # 2026-03, 2026-Q1
    media_type = Column(String(20), nullable=False)  # owned, earned, paid
    channel = Column(String(50))  # seo, blog, linkedin_ads, g2, press
    impressions = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    conversions = Column(Integer, default=0)
    leads = Column(Integer, default=0)
    spend = Column(Float, default=0)
    revenue_attributed = Column(Float, default=0)
    roi = Column(Float, default=0)
