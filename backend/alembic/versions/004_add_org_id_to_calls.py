"""add org_id to call_prompts and call_records

Revision ID: 004_calls_org_id
Revises: 003_code_per_org
Create Date: 2026-04-07

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID


revision: str = "004_calls_org_id"
down_revision: Union[str, None] = "003_code_per_org"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add org_id (nullable) to call_prompts and call_records
    # Nullable to allow existing rows; new rows get assigned org_id by the API
    for table in ("call_prompts", "call_records"):
        # Skip if column already exists (defensive, for re-runs)
        op.add_column(
            table,
            sa.Column(
                "org_id",
                UUID(as_uuid=True),
                sa.ForeignKey("organizations.id", ondelete="CASCADE"),
                nullable=True,
            ),
        )
        op.create_index(f"ix_{table}_org_id", table, ["org_id"])


def downgrade() -> None:
    for table in ("call_prompts", "call_records"):
        op.drop_index(f"ix_{table}_org_id", table_name=table)
        op.drop_column(table, "org_id")
