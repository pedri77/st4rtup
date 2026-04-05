"""add gcal_event_id to visits

Revision ID: 002_gcal_sync
Revises: 001_marketing_hub
Create Date: 2026-04-05

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "002_gcal_sync"
down_revision: Union[str, None] = "001_marketing_hub"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("visits", sa.Column("gcal_event_id", sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column("visits", "gcal_event_id")
