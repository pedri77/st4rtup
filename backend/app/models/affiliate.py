"""Affiliate links model — track partner referrals and revenue."""
from sqlalchemy import Column, String, Text, Float, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import BaseModel


class AffiliateLink(BaseModel):
    __tablename__ = "affiliate_links"

    provider = Column(String(100), nullable=False)
    display_name = Column(String(255), nullable=False)
    affiliate_url = Column(Text, nullable=False)
    logo_url = Column(String(500))
    category = Column(String(50), default="integration")
    commission_percent = Column(Float, default=0)
    commission_type = Column(String(20), default="one_time")
    clicks = Column(Integer, default=0)
    conversions = Column(Integer, default=0)
    revenue_eur = Column(Float, default=0)
    is_active = Column(Boolean, default=True)
    notes = Column(Text)


class AffiliateClick(BaseModel):
    __tablename__ = "affiliate_clicks"

    link_id = Column(UUID(as_uuid=True), ForeignKey("affiliate_links.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True))
    org_id = Column(UUID(as_uuid=True))
    ip_hash = Column(String(64))
    referrer = Column(String(500))
