"""KPI Targets — targets configurables por KPI."""
from sqlalchemy import Column, ForeignKey, String, Float, Text
from sqlalchemy.dialects.postgresql import UUID

from app.models.base import BaseModel


class KpiTarget(BaseModel):
    """Target configurable para cada KPI."""
    __tablename__ = "kpi_targets"

    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)

    kpi_id = Column(String(50), nullable=False, unique=True)
    target_value = Column(Float, nullable=False)
    target_label = Column(String(100))  # ">25%", "€57k", "<90 días"
    period = Column(String(20), default="year_1")  # year_1, year_2, custom
    notes = Column(Text)
