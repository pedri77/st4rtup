"""call_prompts / call_records: org_id NOT NULL

Revision ID: 006_call_not_null
Revises: 005_onboarding
Create Date: 2026-04-07
"""
from alembic import op
import sqlalchemy as sa


revision = "006_call_not_null"
down_revision = "005_onboarding"
branch_labels = None
depends_on = None


def upgrade():
    # Backfill: if any rows still have NULL org_id, assign them to the first
    # organization. In practice we already verified prod has 0 NULL rows, but
    # this keeps the migration safe for any environment.
    op.execute("""
        UPDATE call_prompts
        SET org_id = (SELECT id FROM organizations ORDER BY created_at LIMIT 1)
        WHERE org_id IS NULL
          AND EXISTS (SELECT 1 FROM organizations);
    """)
    op.execute("""
        UPDATE call_records
        SET org_id = (SELECT id FROM organizations ORDER BY created_at LIMIT 1)
        WHERE org_id IS NULL
          AND EXISTS (SELECT 1 FROM organizations);
    """)

    op.alter_column("call_prompts", "org_id", nullable=False)
    op.alter_column("call_records", "org_id", nullable=False)


def downgrade():
    op.alter_column("call_prompts", "org_id", nullable=True)
    op.alter_column("call_records", "org_id", nullable=True)
