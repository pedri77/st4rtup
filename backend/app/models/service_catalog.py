"""Service catalog for configurable product/service offerings."""
from sqlalchemy import Column, String, Text, Float, Boolean, Integer
from app.models.base import BaseModel


class ServiceCatalogItem(BaseModel):
    __tablename__ = "service_catalog"

    name = Column(String(255), nullable=False)
    description = Column(Text)
    price = Column(Float, default=0)
    currency = Column(String(5), default="EUR")
    billing_type = Column(String(20), default="one_time")
    category = Column(String(100))
    is_active = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)
