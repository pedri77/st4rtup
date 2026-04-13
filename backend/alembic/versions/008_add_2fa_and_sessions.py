"""add 2FA fields to users + user_sessions table

Revision ID: 008_2fa_sessions
Revises: 007_setup_checklist
Create Date: 2026-04-13
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision = "008_2fa_sessions"
down_revision = "007_setup_checklist"
branch_labels = None
depends_on = None


def upgrade():
    # 2FA fields on users
    op.add_column("users", sa.Column("totp_secret", sa.String(64), nullable=True))
    op.add_column("users", sa.Column("totp_enabled", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.add_column("users", sa.Column("backup_codes", sa.JSON(), nullable=True))

    # User sessions table
    op.create_table(
        "user_sessions",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("ip_address", sa.String(45)),
        sa.Column("user_agent", sa.Text()),
        sa.Column("device_label", sa.String(100)),
        sa.Column("last_active_at", sa.DateTime(timezone=True)),
        sa.Column("is_current", sa.Boolean(), default=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )


def downgrade():
    op.drop_table("user_sessions")
    op.drop_column("users", "backup_codes")
    op.drop_column("users", "totp_enabled")
    op.drop_column("users", "totp_secret")
