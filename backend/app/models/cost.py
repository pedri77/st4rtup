"""MOD-COST-001 — Cost tracking models."""
from datetime import datetime, timezone

from sqlalchemy import Column, ForeignKey, String, Float, Boolean, Integer, DateTime, Text, JSON
from sqlalchemy.dialects.postgresql import UUID
import uuid

from app.core.database import Base


def _utcnow():
    return datetime.now(timezone.utc)


class CostEvent(Base):
    """Evento de coste individual (rs_cost_events)."""
    __tablename__ = "cost_events"

    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tool_id = Column(String(50), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(5), default="EUR")
    category = Column(String(50))
    description = Column(Text)
    metadata_ = Column("metadata", JSON)
    created_at = Column(DateTime(timezone=True), default=_utcnow)


class BudgetCap(Base):
    """Tope de gasto configurable (rs_budget_caps)."""
    __tablename__ = "budget_caps"

    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tool_id = Column(String(50), nullable=False, unique=True)
    tool_name = Column(String(100), nullable=False)
    monthly_cap = Column(Float, nullable=False)
    warn_pct = Column(Integer, default=70)
    cut_pct = Column(Integer, default=90)
    is_active = Column(Boolean, default=True)
    icon = Column(String(50))
    color = Column(String(50))
    updated_at = Column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)


class GuardrailLog(Base):
    """Audit trail de evaluaciones del GuardrailEngine (rs_cost_guardrail_log)."""
    __tablename__ = "cost_guardrail_log"

    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tool_id = Column(String(50), nullable=False, index=True)
    level = Column(String(20), nullable=False)
    current_spend = Column(Float, nullable=False)
    cap_amount = Column(Float, nullable=False)
    percentage = Column(Float, nullable=False)
    action_taken = Column(Text)
    created_at = Column(DateTime(timezone=True), default=_utcnow)
