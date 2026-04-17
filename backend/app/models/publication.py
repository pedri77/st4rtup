"""Modelo de publicaciones externas — Content Tracker."""
from sqlalchemy import (
    Column, String, Text, Integer, Float, DateTime, JSON, ForeignKey,
    Enum as SAEnum,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import enum

from app.models.base import BaseModel


class PublicationPlatform(str, enum.Enum):
    BLOG = "blog"
    LINKEDIN = "linkedin"
    MEDIUM = "medium"
    DEVTO = "devto"
    YOUTUBE = "youtube"
    TWITTER = "twitter"
    INSTAGRAM = "instagram"
    GITHUB = "github"
    SUBSTACK = "substack"
    OTHER = "other"


class PublicationStatus(str, enum.Enum):
    ACTIVE = "active"
    ARCHIVED = "archived"
    DELETED = "deleted"


class Publication(BaseModel):
    """Publicación externa trackeada."""
    __tablename__ = "publications"

    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)

    url = Column(String(1000), nullable=False)
    title = Column(String(500), nullable=False)
    platform = Column(SAEnum(PublicationPlatform, name="publication_platform", create_type=False), nullable=False, index=True)
    status = Column(SAEnum(PublicationStatus, name="publication_status", create_type=False), nullable=False, index=True)

    # Optional link to internal article
    article_id = Column(UUID(as_uuid=True), ForeignKey("articles.id", ondelete="SET NULL"), nullable=True)

    # Metadata
    author = Column(String(255))
    published_at = Column(DateTime(timezone=True))
    description = Column(Text)
    thumbnail_url = Column(String(1000))
    keywords = Column(JSON)  # ["keyword1", "keyword2"]
    tags = Column(JSON)

    # Metrics (manually updated or via scraping)
    views = Column(Integer, default=0)
    likes = Column(Integer, default=0)
    shares = Column(Integer, default=0)
    comments = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    engagement_rate = Column(Float, default=0.0)

    # Tracking
    last_checked = Column(DateTime(timezone=True))
    notes = Column(Text)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
