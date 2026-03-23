"""Social Media — posts programados y publicados."""
from sqlalchemy import Column, String, Text, Integer, JSON, DateTime, Boolean

from app.models.base import BaseModel


class SocialPost(BaseModel):
    """Post en redes sociales (LinkedIn, Twitter/X, YouTube)."""
    __tablename__ = "social_posts"

    platform = Column(String(50), nullable=False)  # linkedin, twitter, youtube, instagram
    content = Column(Text, nullable=False)
    media_url = Column(String(1000))  # URL de imagen/video adjunto
    status = Column(String(20), default="draft")  # draft, scheduled, published, failed
    scheduled_at = Column(DateTime(timezone=True))
    published_at = Column(DateTime(timezone=True))
    external_id = Column(String(255))  # ID del post en la plataforma
    external_url = Column(String(1000))  # URL del post publicado
    impressions = Column(Integer, default=0)
    likes = Column(Integer, default=0)
    comments = Column(Integer, default=0)
    shares = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    engagement_rate = Column(Integer, default=0)  # basis points (0.01%)
    campaign_id = Column(String(36))  # Optional link to marketing campaign
    tags = Column(JSON, default=list)
    metadata_ = Column("metadata", JSON)
    recurrence_id = Column(String(36))  # FK to SocialRecurrence if auto-generated


class SocialRecurrence(BaseModel):
    """Programacion recurrente de posts en redes sociales."""
    __tablename__ = "social_recurrences"

    name = Column(String(255), nullable=False)
    platform = Column(String(50), nullable=False)
    content_template = Column(Text, nullable=False)  # Soporta {date}, {week}, {topic}
    media_url = Column(String(1000))
    tags = Column(JSON, default=list)
    frequency = Column(String(20), nullable=False)  # daily, weekly, biweekly, monthly
    day_of_week = Column(Integer)  # 0=Mon, 6=Sun (for weekly)
    day_of_month = Column(Integer)  # 1-28 (for monthly)
    time_of_day = Column(String(5), default="10:00")  # HH:MM
    is_active = Column(Boolean, default=True)
    next_run = Column(DateTime(timezone=True))
    total_generated = Column(Integer, default=0)
    metadata_ = Column("metadata", JSON)
