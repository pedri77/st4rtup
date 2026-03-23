"""Pricing Engine — tiers, módulos y cálculo de precio por deal."""
from sqlalchemy import Column, String, Float, Integer, Boolean, Text, JSON

from app.models.base import BaseModel


class PricingTier(BaseModel):
    """Tier de pricing (Pilot, Enterprise, SMB)."""
    __tablename__ = "pricing_tiers"

    name = Column(String(100), nullable=False)  # Pilot PoC, Enterprise, SMB
    slug = Column(String(50), nullable=False, unique=True)
    description = Column(Text)
    base_price = Column(Float, nullable=False)  # Precio base
    price_unit = Column(String(20), default="year")  # year, month, fixed
    duration_days = Column(Integer)  # 90 para PoC, null para suscripción
    min_price = Column(Float)
    max_price = Column(Float)
    modules_included = Column(JSON, default=list)  # ["grc_core", "ens", "nis2", "dora"]
    modules_available = Column(JSON, default=list)  # Módulos opcionales
    infra_cost_monthly = Column(Float, default=0)  # Coste base infra para margen
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
