"""Modelos de pagos — Stripe + PayPal."""
from sqlalchemy import Column, String, Text, Float, Integer, DateTime, JSON, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.models.base import BaseModel


class PaymentPlan(BaseModel):
    __tablename__ = "payment_plans"
    org_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True)

    name = Column(String(255), nullable=False)
    description = Column(Text)
    price_eur = Column(Float, nullable=False)
    interval = Column(String(20), default="month")  # month | year | one_time
    stripe_price_id = Column(String(255))
    paypal_plan_id = Column(String(255))
    features = Column(JSON)  # ["feature1", "feature2"]
    is_active = Column(Boolean, default=True)
    trial_days = Column(Integer, default=0)
    max_users = Column(Integer)
    max_leads = Column(Integer)


class Payment(BaseModel):
    __tablename__ = "payments"

    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id", ondelete="SET NULL"), nullable=True)
    plan_id = Column(UUID(as_uuid=True), ForeignKey("payment_plans.id", ondelete="SET NULL"), nullable=True)

    provider = Column(String(20), nullable=False)  # stripe | paypal
    provider_payment_id = Column(String(255))  # Stripe payment_intent or PayPal order ID
    provider_subscription_id = Column(String(255))
    provider_customer_id = Column(String(255))
    provider_invoice_id = Column(String(255))

    amount_eur = Column(Float, nullable=False)
    currency = Column(String(5), default="EUR")
    status = Column(String(30), nullable=False, index=True)  # pending, completed, failed, refunded, cancelled
    payment_type = Column(String(20), default="one_time")  # one_time, subscription, invoice

    customer_email = Column(String(255))
    customer_name = Column(String(255))
    description = Column(Text)
    invoice_url = Column(String(1000))
    receipt_url = Column(String(1000))

    paid_at = Column(DateTime(timezone=True))
    metadata_ = Column("metadata", JSON, default={})


class Invoice(BaseModel):
    __tablename__ = "invoices"

    payment_id = Column(UUID(as_uuid=True), ForeignKey("payments.id", ondelete="SET NULL"), nullable=True)
    lead_id = Column(UUID(as_uuid=True), ForeignKey("leads.id", ondelete="SET NULL"), nullable=True)

    invoice_number = Column(String(50), unique=True)
    provider = Column(String(20))
    provider_invoice_id = Column(String(255))

    amount_eur = Column(Float, nullable=False)
    tax_rate = Column(Float, default=21.0)  # IVA Espana
    tax_amount = Column(Float)
    total_eur = Column(Float)

    status = Column(String(30), default="draft")  # draft, sent, paid, overdue, cancelled
    customer_name = Column(String(255))
    customer_email = Column(String(255))
    customer_tax_id = Column(String(50))  # CIF/NIF
    customer_address = Column(Text)

    due_date = Column(DateTime(timezone=True))
    paid_at = Column(DateTime(timezone=True))
    pdf_url = Column(String(1000))
    notes = Column(Text)
