"""API versioning middleware.

Sets request.state.api_version from X-API-Version header (default: v1).
Returns X-API-Version header in all responses.
"""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

CURRENT_VERSION = "v1"
SUPPORTED_VERSIONS = {"v1"}


class APIVersionMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Read version from header or default
        version = request.headers.get("x-api-version", CURRENT_VERSION).lower()
        if version not in SUPPORTED_VERSIONS:
            version = CURRENT_VERSION

        request.state.api_version = version

        response = await call_next(request)
        response.headers["X-API-Version"] = version
        return response
