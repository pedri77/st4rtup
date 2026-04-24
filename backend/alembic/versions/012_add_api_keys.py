"""Add api_keys table for M2M authentication.

API keys are stored as SHA-256 hashes (plaintext never persisted).
Keys have scopes, expiration, and revocation support.

Revision ID: 012_api_keys
Revises: 011_rls_all
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision = "012_api_keys"
down_revision = "011_rls_all"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "api_keys",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(128), nullable=False),
        sa.Column("key_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("key_prefix", sa.String(12), nullable=False),
        sa.Column("scopes", JSONB, server_default='["read"]'),
        sa.Column("is_active", sa.Boolean, server_default="true"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.String(128), server_default="admin"),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_api_keys_key_hash", "api_keys", ["key_hash"])

    # Enable RLS (consistent with 011)
    op.execute("ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY")
    op.execute("""CREATE POLICY api_keys_service ON api_keys FOR ALL TO service_role USING (true) WITH CHECK (true)""")
    op.execute("""CREATE POLICY api_keys_postgres ON api_keys FOR ALL TO postgres USING (true) WITH CHECK (true)""")


def downgrade():
    op.execute("DROP POLICY IF EXISTS api_keys_postgres ON api_keys")
    op.execute("DROP POLICY IF EXISTS api_keys_service ON api_keys")
    op.drop_index("ix_api_keys_key_hash")
    op.drop_table("api_keys")
