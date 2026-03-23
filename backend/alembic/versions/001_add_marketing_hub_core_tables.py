"""add marketing hub core tables

Revision ID: 001_marketing_hub
Revises:
Create Date: 2026-03-14

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "001_marketing_hub"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum types
    campaign_objective = postgresql.ENUM(
        "lead_gen", "brand", "nurturing", "reactivation",
        name="campaignobjective", create_type=False,
    )
    campaign_channel = postgresql.ENUM(
        "linkedin_ads", "google_ads", "seo", "email", "youtube", "webinar", "event",
        name="campaignchannel", create_type=False,
    )
    campaign_status = postgresql.ENUM(
        "draft", "active", "paused", "finished",
        name="campaignstatus", create_type=False,
    )
    funnel_status = postgresql.ENUM(
        "draft", "active", "archived",
        name="funnelstatus", create_type=False,
    )
    asset_type = postgresql.ENUM(
        "landing_page", "cta_button", "cta_banner", "cta_popup", "cta_form",
        name="marketingassettype", create_type=False,
    )
    asset_status = postgresql.ENUM(
        "active", "draft", "archived",
        name="marketingassetstatus", create_type=False,
    )
    asset_language = postgresql.ENUM(
        "es", "en", "pt",
        name="assetlanguage", create_type=False,
    )
    event_type = postgresql.ENUM(
        "seo_article", "campaign_launch", "email_newsletter",
        "youtube_video", "webinar_event", "social_post",
        name="calendareventtype", create_type=False,
    )
    alert_severity = postgresql.ENUM(
        "info", "warning", "critical",
        name="alertseverity", create_type=False,
    )

    # Create all enum types in the database
    campaign_objective.create(op.get_bind(), checkfirst=True)
    campaign_channel.create(op.get_bind(), checkfirst=True)
    campaign_status.create(op.get_bind(), checkfirst=True)
    funnel_status.create(op.get_bind(), checkfirst=True)
    asset_type.create(op.get_bind(), checkfirst=True)
    asset_status.create(op.get_bind(), checkfirst=True)
    asset_language.create(op.get_bind(), checkfirst=True)
    event_type.create(op.get_bind(), checkfirst=True)
    alert_severity.create(op.get_bind(), checkfirst=True)

    # 1. campaigns (no FK dependencies on other new tables)
    op.create_table(
        "campaigns",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("objective", campaign_objective, nullable=False),
        sa.Column("channel", campaign_channel, nullable=False),
        sa.Column("status", campaign_status, nullable=False, server_default="draft"),
        sa.Column("budget_total", sa.Float(), server_default="0"),
        sa.Column("budget_monthly", sa.JSON()),
        sa.Column("persona_target", sa.String(100)),
        sa.Column("regulatory_focus", sa.String(100)),
        sa.Column("geo_target", postgresql.ARRAY(sa.String())),
        sa.Column("start_date", sa.Date()),
        sa.Column("end_date", sa.Date()),
        sa.Column("leads_goal", sa.Integer(), server_default="0"),
        sa.Column("mqls_goal", sa.Integer(), server_default="0"),
        sa.Column("max_cpl", sa.Float()),
        sa.Column("days_without_leads_alert", sa.Integer()),
        sa.Column("created_by", sa.UUID(), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_campaigns_name", "campaigns", ["name"])
    op.create_index("ix_campaigns_status", "campaigns", ["status"])

    # 2. funnels (FK → campaigns)
    op.create_table(
        "funnels",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("status", funnel_status, nullable=False, server_default="draft"),
        sa.Column("stages", sa.JSON()),
        sa.Column("campaign_id", sa.UUID(), sa.ForeignKey("campaigns.id", ondelete="SET NULL")),
        sa.Column("created_by", sa.UUID(), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_funnels_status", "funnels", ["status"])
    op.create_index("ix_funnels_campaign_id", "funnels", ["campaign_id"])

    # 3. marketing_assets (FK → campaigns, funnels)
    op.create_table(
        "marketing_assets",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("type", asset_type, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("url", sa.String(500)),
        sa.Column("status", asset_status, nullable=False, server_default="draft"),
        sa.Column("language", asset_language, server_default="es"),
        sa.Column("has_hreflang", sa.Boolean(), server_default="false"),
        sa.Column("visits", sa.Integer(), server_default="0"),
        sa.Column("conversions", sa.Integer(), server_default="0"),
        sa.Column("impressions", sa.Integer(), server_default="0"),
        sa.Column("clicks", sa.Integer(), server_default="0"),
        sa.Column("campaign_id", sa.UUID(), sa.ForeignKey("campaigns.id", ondelete="SET NULL")),
        sa.Column("funnel_id", sa.UUID(), sa.ForeignKey("funnels.id", ondelete="SET NULL")),
        sa.Column("created_by", sa.UUID(), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_marketing_assets_status", "marketing_assets", ["status"])
    op.create_index("ix_marketing_assets_campaign_id", "marketing_assets", ["campaign_id"])
    op.create_index("ix_marketing_assets_funnel_id", "marketing_assets", ["funnel_id"])

    # 4. utm_codes (FK → campaigns)
    op.create_table(
        "utm_codes",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("base_url", sa.String(500), nullable=False),
        sa.Column("utm_source", sa.String(100), nullable=False),
        sa.Column("utm_medium", sa.String(100), nullable=False),
        sa.Column("utm_campaign", sa.String(255), nullable=False),
        sa.Column("utm_content", sa.String(255)),
        sa.Column("utm_term", sa.String(255)),
        sa.Column("full_url", sa.String(2000), nullable=False),
        sa.Column("campaign_id", sa.UUID(), sa.ForeignKey("campaigns.id", ondelete="SET NULL")),
        sa.Column("created_by", sa.UUID(), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_utm_codes_campaign_id", "utm_codes", ["campaign_id"])

    # 5. marketing_calendar_events (FK → campaigns, users)
    op.create_table(
        "marketing_calendar_events",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("event_type", event_type, nullable=False),
        sa.Column("channel", sa.String(50)),
        sa.Column("description", sa.Text()),
        sa.Column("geo_target", postgresql.ARRAY(sa.String())),
        sa.Column("start_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("end_date", sa.DateTime(timezone=True)),
        sa.Column("all_day", sa.Boolean(), server_default="false"),
        sa.Column("color", sa.String(20)),
        sa.Column("campaign_id", sa.UUID(), sa.ForeignKey("campaigns.id", ondelete="SET NULL")),
        sa.Column("responsible_id", sa.UUID(), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("created_by", sa.UUID(), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_mkt_cal_events_campaign_id", "marketing_calendar_events", ["campaign_id"])

    # 6. marketing_alerts (no FK to new tables)
    op.create_table(
        "marketing_alerts",
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("alert_type", sa.String(100), nullable=False),
        sa.Column("severity", alert_severity, nullable=False),
        sa.Column("entity_type", sa.String(50)),
        sa.Column("entity_id", sa.UUID()),
        sa.Column("entity_name", sa.String(255)),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("threshold_value", sa.Float()),
        sa.Column("actual_value", sa.Float()),
        sa.Column("geo_context", sa.String(100)),
        sa.Column("is_read", sa.Boolean(), server_default="false"),
        sa.Column("resolved_at", sa.DateTime(timezone=True)),
        sa.Column("created_by", sa.UUID(), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_marketing_alerts_severity", "marketing_alerts", ["severity"])
    op.create_index("ix_marketing_alerts_is_read", "marketing_alerts", ["is_read"])


def downgrade() -> None:
    # Drop tables in reverse dependency order
    op.drop_table("marketing_alerts")
    op.drop_table("marketing_calendar_events")
    op.drop_table("utm_codes")
    op.drop_table("marketing_assets")
    op.drop_table("funnels")
    op.drop_table("campaigns")

    # Drop enum types
    for enum_name in [
        "alertseverity", "calendareventtype", "assetlanguage",
        "marketingassetstatus", "marketingassettype", "funnelstatus",
        "campaignstatus", "campaignchannel", "campaignobjective",
    ]:
        op.execute(f"DROP TYPE IF EXISTS {enum_name}")
