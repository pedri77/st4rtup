"""Tracks feature usage per user for analytics and churn detection."""
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.models.base import BaseModel


class UsageEvent(BaseModel):
    __tablename__ = "usage_events"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    feature = Column(String(50), nullable=False, index=True)
    action = Column(String(30), nullable=False)
    count = Column(Integer, default=1)
    day = Column(DateTime(timezone=True), default=func.current_date(), index=True)
