"""KPI Targets — targets configurables por KPI."""
from sqlalchemy import Column, String, Float, Text

from app.models.base import BaseModel


class KpiTarget(BaseModel):
    """Target configurable para cada KPI."""
    __tablename__ = "kpi_targets"

    kpi_id = Column(String(50), nullable=False, unique=True)
    target_value = Column(Float, nullable=False)
    target_label = Column(String(100))  # ">25%", "€57k", "<90 días"
    period = Column(String(20), default="year_1")  # year_1, year_2, custom
    notes = Column(Text)
