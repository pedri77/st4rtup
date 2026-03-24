"""Modelo de suscripción — Plan gating para St4rtup."""
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, JSON, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.models.base import BaseModel


class Subscription(BaseModel):
    __tablename__ = "subscriptions"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    plan = Column(String(20), nullable=False, default="starter")  # starter | growth | scale | enterprise
    status = Column(String(20), nullable=False, default="active")  # active | cancelled | past_due | trialing

    # Stripe
    stripe_customer_id = Column(String(255))
    stripe_subscription_id = Column(String(255))
    stripe_price_id = Column(String(255))

    # Billing
    billing_cycle = Column(String(10), default="monthly")  # monthly | annual
    amount_eur = Column(Float, default=0)

    # Dates
    trial_ends_at = Column(DateTime(timezone=True))
    current_period_start = Column(DateTime(timezone=True))
    current_period_end = Column(DateTime(timezone=True))
    cancelled_at = Column(DateTime(timezone=True))


# ── Plan limits configuration ────────────────────────────────

PLAN_LIMITS = {
    "starter": {
        "max_users": 1,
        "max_leads": 100,
        "features": [
            "leads", "pipeline", "visits", "emails", "actions",
        ],
        "integrations_max": 1,
    },
    "growth": {
        "max_users": 3,
        "max_leads": 999999,  # "ilimitados"
        "features": [
            "leads", "pipeline", "visits", "emails", "actions",
            "contacts", "surveys", "reviews", "calendar",
            "marketing", "campaigns", "seo_center", "funnels", "assets", "utm", "analytics",
            "ai_agents", "ai_summary", "auto_tagging", "smart_forms",
            "calls_console", "calls_prompts", "calls_rgpd",
            "automations", "reports", "dashboard_graphs",
            "youtube", "airtable",
            "gmail", "gdrive", "slack", "teams", "telegram", "webhooks",
        ],
        "integrations_max": 999,
    },
    "scale": {
        "max_users": 10,
        "max_leads": 999999,
        "features": [
            # Todo de growth +
            "deal_room", "nda_digital", "pdf_watermark", "page_analytics",
            "whatsapp", "whatsapp_bot",
            "calls_queue", "calls_ab_testing",
            "public_api", "embeddable_widgets",
            "payments", "stripe", "paypal",
            "priority_support",
        ],
        "integrations_max": 999,
    },
    "enterprise": {
        "max_users": 999999,
        "max_leads": 999999,
        "features": ["*"],  # Todo
        "integrations_max": 999,
        "extras": ["sso_saml", "sla_999", "dedicated_manager", "custom_onboarding", "invoice_billing"],
    },
}


def get_plan_limits(plan: str) -> dict:
    """Returns limits for a plan. Defaults to starter."""
    return PLAN_LIMITS.get(plan, PLAN_LIMITS["starter"])


def plan_has_feature(plan: str, feature: str) -> bool:
    """Check if a plan includes a specific feature."""
    limits = get_plan_limits(plan)
    features = limits["features"]
    if "*" in features:
        return True
    return feature in features


def get_plan_hierarchy():
    """Returns plans in order from lowest to highest."""
    return ["starter", "growth", "scale", "enterprise"]


def plan_at_least(current_plan: str, required_plan: str) -> bool:
    """Check if current plan is at least the required level."""
    hierarchy = get_plan_hierarchy()
    try:
        return hierarchy.index(current_plan) >= hierarchy.index(required_plan)
    except ValueError:
        return False
