"""Modelo de artículos para el SEO Command Center."""
from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean, DateTime, JSON, ForeignKey,
    Enum as SAEnum,
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.sql import func
import enum

from app.models.base import BaseModel


class ArticleStatus(str, enum.Enum):
    DRAFT = "draft"
    REVIEW = "review"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class ArticleType(str, enum.Enum):
    BLOG = "blog"
    CASE_STUDY = "case_study"
    WHITEPAPER = "whitepaper"
    GUIDE = "guide"
    NORMATIVA = "normativa"
    COMPARATIVA = "comparativa"
    NEWS = "news"


class Article(BaseModel):
    """Artículo del Content Hub — SEO Command Center."""
    __tablename__ = "articles"
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)

    title = Column(String(500), nullable=False)
    slug = Column(String(500), unique=True, index=True)
    excerpt = Column(Text)
    content = Column(Text, nullable=False)
    content_html = Column(Text)

    # SEO metadata
    meta_title = Column(String(70))
    meta_description = Column(String(160))
    canonical_url = Column(String(500))
    og_image = Column(String(500))
    schema_markup = Column(JSON)

    # Classification
    article_type = Column(SAEnum(ArticleType, name="article_type", create_type=False), default=ArticleType.BLOG, index=True)
    status = Column(SAEnum(ArticleStatus, name="article_status", create_type=False), default=ArticleStatus.DRAFT, index=True)
    category = Column(String(100))
    tags = Column(ARRAY(String))
    regulatory_focus = Column(ARRAY(String))  # ENS, NIS2, DORA, ISO27001, AI_ACT

    # Keywords
    primary_keyword = Column(String(200))
    secondary_keywords = Column(ARRAY(String))
    keyword_density = Column(Float)
    seo_score = Column(Integer)  # 0-100

    # Publishing
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    published_at = Column(DateTime(timezone=True))
    scheduled_at = Column(DateTime(timezone=True))
    word_count = Column(Integer, default=0)
    reading_time_min = Column(Integer, default=0)

    # Analytics
    views = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    avg_time_on_page_s = Column(Integer, default=0)
    bounce_rate = Column(Float, default=0.0)

    # Content Pipeline reference
    pipeline_output = Column(JSON)  # Full output from Content Pipeline agents

    # Repurposed content
    repurposed = Column(JSON)  # {linkedin: "...", twitter: "...", email: "...", video_script: "..."}

    # Site Health
    last_audit_at = Column(DateTime(timezone=True))
    audit_score = Column(Integer)  # 0-100
    audit_issues = Column(JSON)  # [{type, severity, message}]
