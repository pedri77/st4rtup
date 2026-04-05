"""automation code unique per org instead of global

Revision ID: 003_code_per_org
Revises: 002_gcal_sync
Create Date: 2026-04-05

"""
from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "003_code_per_org"
down_revision: Union[str, None] = "002_gcal_sync"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop global unique constraint on code
    op.drop_constraint("automations_code_key", "automations", type_="unique")
    # Add composite unique constraint (org_id, code)
    op.create_unique_constraint("uq_automation_org_code", "automations", ["org_id", "code"])


def downgrade() -> None:
    op.drop_constraint("uq_automation_org_code", "automations", type_="unique")
    op.create_unique_constraint("automations_code_key", "automations", ["code"])
