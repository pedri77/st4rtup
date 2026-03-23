"""
Multi-tenancy middleware + Keycloak integration scaffold.
Trigger: first MSSP client needs isolated data.

Estrategia: Row-Level Security (RLS) con tenant_id en cada tabla.
Keycloak proporciona JWT con tenant_id claim.

Para activar:
1. Deploy Keycloak (Docker o managed)
2. Crear realm 'st4rtup' con client 'sales-crm'
3. Configurar KEYCLOAK_URL, KEYCLOAK_REALM, KEYCLOAK_CLIENT_ID
4. Ejecutar migration 044_add_tenant_id.sql
5. Activar middleware en main.py
"""
import logging
from typing import Optional
from uuid import UUID

from fastapi import Request, HTTPException
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

KEYCLOAK_URL = getattr(settings, "KEYCLOAK_URL", "")
KEYCLOAK_REALM = getattr(settings, "KEYCLOAK_REALM", "st4rtup")
KEYCLOAK_CLIENT_ID = getattr(settings, "KEYCLOAK_CLIENT_ID", "sales-crm")


async def get_tenant_from_token(request: Request) -> Optional[str]:
    """Extrae tenant_id del JWT (claim custom 'tenant_id')."""
    # When Keycloak is not configured, return default tenant
    if not KEYCLOAK_URL:
        return "default"

    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return "default"

    token = auth.split(" ", 1)[1]
    try:
        # Validate token with Keycloak
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(
                f"{KEYCLOAK_URL}/realms/{KEYCLOAK_REALM}/protocol/openid-connect/userinfo",
                headers={"Authorization": f"Bearer {token}"},
            )
            if r.status_code == 200:
                userinfo = r.json()
                return userinfo.get("tenant_id", "default")
    except Exception:
        logger.warning("Keycloak token validation failed")

    return "default"


class TenantMiddleware:
    """ASGI middleware que inyecta tenant_id en request.state."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            # Extract tenant from subdomain or header
            headers = dict(scope.get("headers", []))
            host = headers.get(b"host", b"").decode()
            tenant_header = headers.get(b"x-tenant-id", b"").decode()

            tenant_id = tenant_header or "default"

            # Subdomain-based tenancy: tenant.app.st4rtup.app
            if "." in host:
                subdomain = host.split(".")[0]
                if subdomain not in ("sales", "www", "api", "localhost"):
                    tenant_id = subdomain

            scope["state"] = scope.get("state", {})
            scope["state"]["tenant_id"] = tenant_id

        await self.app(scope, receive, send)


# SQL migration for tenant support
MIGRATION_SQL = """
-- 044: Multi-tenancy support
-- Run this when activating multi-tenancy

ALTER TABLE leads ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT 'default';
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT 'default';
ALTER TABLE actions ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT 'default';
ALTER TABLE visits ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT 'default';
ALTER TABLE emails ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT 'default';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT 'default';
ALTER TABLE offers ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(50) DEFAULT 'default';

CREATE INDEX IF NOT EXISTS ix_leads_tenant ON leads(tenant_id);
CREATE INDEX IF NOT EXISTS ix_opportunities_tenant ON opportunities(tenant_id);
CREATE INDEX IF NOT EXISTS ix_actions_tenant ON actions(tenant_id);

-- Enable Row Level Security
-- ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY tenant_isolation_leads ON leads USING (tenant_id = current_setting('app.tenant_id'));
"""
