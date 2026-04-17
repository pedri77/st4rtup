"""Modelo de backlinks para SEO off-site tracking."""
from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean, DateTime, JSON, ForeignKey,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func

from app.models.base import BaseModel


class Backlink(BaseModel):
    """Backlink tracker — SEO off-site."""
    __tablename__ = "backlinks"

    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)

    source_url = Column(String(1000), nullable=False)
    source_domain = Column(String(255), nullable=False, index=True)
    target_url = Column(String(1000), nullable=False)
    anchor_text = Column(String(500))
    link_type = Column(String(20), default="dofollow")  # dofollow | nofollow | ugc | sponsored
    domain_authority = Column(Integer)  # 0-100
    page_authority = Column(Integer)  # 0-100
    status = Column(String(20), default="active", index=True)  # active | lost | broken | pending
    first_seen = Column(DateTime(timezone=True), server_default=func.now())
    last_checked = Column(DateTime(timezone=True))
    category = Column(String(100))  # guest_post, directory, mention, press, forum, social
    contact_email = Column(String(255))
    outreach_status = Column(String(30))  # none | contacted | replied | accepted | rejected
    notes = Column(Text)
