"""add setup_checklist JSON column to organizations

Revision ID: 007_setup_checklist
Revises: 006_call_org_id_not_null
Create Date: 2026-04-13
"""
from alembic import op
import sqlalchemy as sa


revision = "007_setup_checklist"
down_revision = "006_call_org_id_not_null"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "organizations",
        sa.Column(
            "setup_checklist",
            sa.JSON(),
            nullable=True,
            server_default='{"dismissed": false, "completed": []}',
        ),
    )


def downgrade():
    op.drop_column("organizations", "setup_checklist")
