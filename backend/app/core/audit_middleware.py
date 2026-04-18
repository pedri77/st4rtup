"""Middleware that automatically logs POST/PUT/DELETE requests to audit_logs."""
import logging
import time
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.audit_log import AuditLog
from app.models.user import User

logger = logging.getLogger(__name__)

# Endpoints to skip (health checks, reads disguised as POST, etc.)
SKIP_PATHS = {
    "/health",
    "/api/v1/users/me/profile",
    "/api/v1/settings/test-email",
    "/api/v1/settings/test-integration",
    "/api/v1/settings/send-test-email",
    "/api/v1/admin/logs",
    "/api/v1/admin/health",
}

# Map URL patterns to entity types
ENTITY_MAP = {
    "leads": "lead",
    "visits": "visit",
    "emails": "email",
    "actions": "action",
    "opportunities": "opportunity",
    "offers": "offer",
    "contacts": "contact",
    "surveys": "survey",
    "automations": "automation",
    "users": "user",
    "settings": "setting",
    "notifications": "notification",
    "campaigns": "campaign",
    "admin": "admin",
}


def _extract_entity(path: str) -> tuple[str, str | None]:
    """Extract entity_type and entity_id from URL path."""
    parts = path.replace("/api/v1/", "").strip("/").split("/")
    entity_type = ENTITY_MAP.get(parts[0], parts[0]) if parts else "unknown"

    # Check if second part looks like a UUID or ID
    entity_id = None
    if len(parts) >= 2 and len(parts[1]) > 8 and "-" in parts[1]:
        entity_id = parts[1]

    return entity_type, entity_id


def _method_to_action(method: str) -> str:
    return {"POST": "create", "PUT": "update", "PATCH": "update", "DELETE": "delete"}.get(method, method.lower())


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Only audit mutations
        if request.method not in ("POST", "PUT", "PATCH", "DELETE"):
            return await call_next(request)

        path = request.url.path

        # Skip non-API and excluded paths
        if not path.startswith("/api/v1") or path in SKIP_PATHS:
            return await call_next(request)

        start = time.time()
        response = await call_next(request)
        duration_ms = int((time.time() - start) * 1000)

        # Only log successful mutations
        if response.status_code >= 400:
            return response

        # Extract user from auth header (best-effort, non-blocking)
        try:
            user_email = "unknown"
            user_id = None

            auth = request.headers.get("authorization", "")
            if auth.startswith("Bearer "):
                import json, base64
                token = auth.split(" ", 1)[1]
                # Decode JWT payload without verification (best-effort for audit)
                try:
                    payload_b64 = token.split(".")[1]
                    payload_b64 += "=" * (4 - len(payload_b64) % 4)
                    payload = json.loads(base64.urlsafe_b64decode(payload_b64))
                    user_email = payload.get("email", "unknown")
                    user_id = payload.get("sub")
                except Exception:
                    pass

            entity_type, entity_id = _extract_entity(path)
            action = _method_to_action(request.method)

            # Determine module
            module = "crm"
            if "/admin/" in path:
                module = "admin"
            elif "/marketing" in path:
                module = "marketing"
            elif "/settings" in path:
                module = "system"

            # Get client IP
            ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown")
            if "," in ip:
                ip = ip.split(",")[0].strip()

            # Write audit entry async (non-blocking)
            async with AsyncSessionLocal() as db:
                entry = AuditLog(
                    user_id=user_id,
                    user_email=user_email,
                    action=action,
                    entity_type=entity_type,
                    entity_id=entity_id,
                    description=f"{request.method} {path} ({response.status_code}) {duration_ms}ms",
                    ip_address=ip,
                    user_agent=request.headers.get("user-agent", "")[:500],
                    module=module,
                )
                db.add(entry)
                await db.commit()

        except Exception as e:
            # Never let audit logging break the request
            logger.debug(f"Audit log failed: {e}")

        return response
