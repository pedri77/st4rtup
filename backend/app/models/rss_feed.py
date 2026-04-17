"""RSS Feed model for LinkedIn Studio content inspiration."""
from sqlalchemy import Column, ForeignKey, String, Boolean, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import BaseModel


class RssFeed(BaseModel):
    """Feed RSS configurable para inspiracion de contenido LinkedIn."""
    __tablename__ = "rss_feeds"

    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)

    name = Column(String(255), nullable=False)
    url = Column(String(1000), nullable=False)
    category = Column(String(100), default="general")
    is_active = Column(Boolean, default=True)
    last_fetched = Column(DateTime(timezone=True))
    total_articles = Column(Integer, default=0)
