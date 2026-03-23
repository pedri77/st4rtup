"""Modelos para SEO Organic y Geo-SEO."""
from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean, Date, JSON, ForeignKey,
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


# ─── SEO Organic (Step 13) ────────────────────────────────────


class SEOKeyword(BaseModel):
    """Keyword monitorizada para SEO organic."""
    __tablename__ = "seo_keywords"

    keyword = Column(String(255), nullable=False, index=True)
    language = Column(String(10), default="es")  # es, en, pt
    location = Column(String(100), default="Spain")  # Country or city
    search_volume = Column(Integer)
    difficulty = Column(Float)  # 0-100
    cpc = Column(Float)  # Cost per click
    category = Column(String(50), index=True)  # grc, compliance, ens, nis2, dora, iso27001, ai_act
    is_active = Column(Boolean, default=True, index=True)
    target_url = Column(String(500))  # URL we want to rank for
    notes = Column(Text)

    # FK
    campaign_id = Column(
        UUID(as_uuid=True),
        ForeignKey("campaigns.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    rankings = relationship("SEORanking", back_populates="keyword", cascade="all, delete-orphan")


class SEORanking(BaseModel):
    """Registro histórico de ranking para una keyword."""
    __tablename__ = "seo_rankings"

    keyword_id = Column(
        UUID(as_uuid=True),
        ForeignKey("seo_keywords.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    check_date = Column(Date, nullable=False, index=True)
    position = Column(Integer)  # 1-100, null = not found
    url_found = Column(String(500))  # URL that ranked
    provider = Column(String(30), default="manual")  # dataforseo, semrush, serper, manual
    country = Column(String(10), default="ES")
    device = Column(String(20), default="desktop")  # desktop, mobile
    previous_position = Column(Integer)  # For change tracking
    serp_features = Column(JSON)  # {"featured_snippet": false, "people_also_ask": true}

    # Relationships
    keyword = relationship("SEOKeyword", back_populates="rankings")


# ─── Geo-SEO (Step 14) ───────────────────────────────────────


class GeoPage(BaseModel):
    """Página geo-localizada para SEO local."""
    __tablename__ = "geo_pages"

    title = Column(String(255), nullable=False)
    url = Column(String(500), nullable=False)
    country = Column(String(10), nullable=False, index=True)  # ES, PT, etc.
    region = Column(String(100))  # Comunidad autónoma / region
    city = Column(String(100))
    language = Column(String(10), default="es")
    hreflang_tags = Column(JSON)  # [{"lang": "es", "url": "..."}, {"lang": "en", "url": "..."}]
    target_keywords = Column(ARRAY(String))  # ["grc madrid", "cumplimiento ens madrid"]
    status = Column(String(20), default="active")  # active, draft, archived
    meta_title = Column(String(255))
    meta_description = Column(Text)
    schema_markup = Column(JSON)  # LocalBusiness JSON-LD
    notes = Column(Text)

    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )


class NAPAudit(BaseModel):
    """Auditoría NAP (Name, Address, Phone) consistency."""
    __tablename__ = "nap_audits"

    source = Column(String(100), nullable=False)  # google_business, yelp, paginas_amarillas, einforma
    source_url = Column(String(500))
    business_name = Column(String(255))
    address = Column(Text)
    phone = Column(String(50))
    website = Column(String(500))
    is_consistent = Column(Boolean)  # vs canonical NAP
    inconsistencies = Column(JSON)  # {"name": "different", "phone": "missing"}
    check_date = Column(Date, nullable=False)
    country = Column(String(10), default="ES")
    notes = Column(Text)

    created_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )


class GeoKeywordRanking(BaseModel):
    """Rankings de keywords geo-modificadas por localización."""
    __tablename__ = "geo_keyword_rankings"

    keyword = Column(String(255), nullable=False, index=True)
    location = Column(String(100), nullable=False)  # "Madrid", "Barcelona", "Valencia"
    country = Column(String(10), default="ES")
    check_date = Column(Date, nullable=False, index=True)
    position = Column(Integer)  # 1-100
    url_found = Column(String(500))
    local_pack_position = Column(Integer)  # Position in Google local pack (1-3)
    provider = Column(String(30), default="manual")
    device = Column(String(20), default="desktop")
