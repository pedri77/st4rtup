"""Organization model for multi-tenancy."""
from sqlalchemy import Column, String, Integer, Boolean, DateTime, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.models.base import BaseModel


class Organization(BaseModel):
    __tablename__ = "organizations"

    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True)
    sector = Column(String(100))
    plan = Column(String(20), default="starter")
    logo_url = Column(String(500))
    settings = Column(JSON, default={})
    stripe_customer_id = Column(String(255))
    stripe_subscription_id = Column(String(255))
    trial_ends_at = Column(DateTime(timezone=True))
    max_users = Column(Integer, default=1)
    max_leads = Column(Integer, default=100)
    is_active = Column(Boolean, default=True)
    onboarding_completed = Column(Boolean, default=False, nullable=False)
    onboarding_data = Column(JSON, default={})
    setup_checklist = Column(JSON, default={"dismissed": False, "completed": []})


class OrgMember(BaseModel):
    __tablename__ = "org_members"

    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), default="member")
    invited_at = Column(DateTime(timezone=True))
    accepted_at = Column(DateTime(timezone=True))
