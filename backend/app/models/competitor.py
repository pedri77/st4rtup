"""Competitive Intelligence — competidores y battle cards."""
from sqlalchemy import Column, String, Integer, Boolean, Text, JSON

from app.models.base import BaseModel


class Competitor(BaseModel):
    """Competidor GRC."""
    __tablename__ = "competitors"

    name = Column(String(255), nullable=False, unique=True)
    region = Column(String(20), default="global")  # local, europe, global
    tier = Column(String(20), default="medium")  # critical, high, medium, low
    scope = Column(Text)  # Descripción corta del alcance
    model = Column(Text)  # Modelo de negocio
    maturity_score = Column(Integer, default=50)  # 0-100
    price_range = Column(String(100))
    nis2_support = Column(String(5), default="✗")
    dora_support = Column(String(5), default="✗")
    auto_evidence = Column(String(5), default="✗")
    ux_midmarket = Column(String(5), default="✗")
    differentiators = Column(Text)
    analysis = Column(Text)  # Análisis completo
    weakness = Column(Text)  # Debilidad frente a St4rtup
    vs_riskitera = Column(Text)  # Posicionamiento St4rtup vs competidor
    strengths = Column(JSON, default=list)
    weaknesses = Column(JSON, default=list)
    tags = Column(JSON, default=list)
    battle_card_md = Column(Text)
    website = Column(String(500))
    logo_url = Column(String(500))
    is_active = Column(Boolean, default=True)
