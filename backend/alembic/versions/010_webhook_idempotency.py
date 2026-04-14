"""add processed_webhook_events table for idempotency

Revision ID: 010_webhook_idempotency
Revises: 009_impersonation_tokens
Create Date: 2026-04-13
"""
from alembic import op
import sqlalchemy as sa


revision = "010_webhook_idempotency"
down_revision = "009_impersonation_tokens"
branch_labels = None
depends_on = None


def upgrade():
    from sqlalchemy import inspect
    if "processed_webhook_events" in inspect(op.get_bind()).get_table_names():
        return
    op.create_table(
        "processed_webhook_events",
        sa.Column("event_id", sa.String(255), primary_key=True),
        sa.Column("event_type", sa.String(100)),
        sa.Column("processed_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table("processed_webhook_events")
