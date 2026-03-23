"""OKR — Objectives and Key Results vinculados a KPIs."""
from sqlalchemy import Column, String, Float, Integer, Text

from app.models.base import BaseModel


class Objective(BaseModel):
    """Objetivo trimestral."""
    __tablename__ = "okr_objectives"

    title = Column(String(500), nullable=False)
    description = Column(Text)
    quarter = Column(String(10), nullable=False)  # 2026-Q1, 2026-Q2...
    category = Column(String(50))  # revenue, pipeline, marketing, product
    owner = Column(String(255))
    progress = Column(Float, default=0)  # 0-100 auto-calculated from key results
    status = Column(String(20), default="active")  # active, completed, cancelled
    sort_order = Column(Integer, default=0)


class KeyResult(BaseModel):
    """Key Result vinculado a un objetivo y opcionalmente a un KPI."""
    __tablename__ = "okr_key_results"

    objective_id = Column(String(36), nullable=False)  # UUID as string for simplicity
    title = Column(String(500), nullable=False)
    kpi_id = Column(String(50))  # Links to KPI id (e.g. "arr", "win_rate")
    target_value = Column(Float)
    current_value = Column(Float, default=0)
    unit = Column(String(20))  # eur, pct, count, days, ratio
    progress = Column(Float, default=0)  # 0-100
    sort_order = Column(Integer, default=0)
