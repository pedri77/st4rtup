"""add used_impersonation_tokens table for audit trail

Revision ID: 009_impersonation_tokens
Revises: 008_2fa_sessions
Create Date: 2026-04-13
"""
from alembic import op
import sqlalchemy as sa


revision = "009_impersonation_tokens"
down_revision = "008_2fa_sessions"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "used_impersonation_tokens",
        sa.Column("jti", sa.String(64), primary_key=True),
        sa.Column("admin_email", sa.String(255)),
        sa.Column("target_user_id", sa.String(36)),
        sa.Column("org_id", sa.String(36)),
        sa.Column("ip_address", sa.String(45)),
        sa.Column("used_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table("used_impersonation_tokens")
