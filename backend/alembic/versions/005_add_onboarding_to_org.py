"""add onboarding_completed and onboarding_data to organizations

Revision ID: 005_onboarding
Revises: 004_add_org_id_to_calls
Create Date: 2026-04-07
"""
from alembic import op
import sqlalchemy as sa


revision = "005_onboarding"
down_revision = "004_calls_org_id"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "organizations",
        sa.Column("onboarding_completed", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "organizations",
        sa.Column("onboarding_data", sa.JSON(), nullable=True, server_default="{}"),
    )


def downgrade():
    op.drop_column("organizations", "onboarding_data")
    op.drop_column("organizations", "onboarding_completed")
