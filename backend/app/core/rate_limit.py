"""Rate limiting middleware using slowapi."""
from slowapi import Limiter, _rate_limit_exceeded_handler  # noqa: F401 (re-exported)
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded  # noqa: F401 (re-exported)
from fastapi import Request


def _get_client_ip(request: Request) -> str:
    """Extract client IP from Fly.io proxy headers or fallback."""
    forwarded = request.headers.get("fly-client-ip") or request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return get_remote_address(request)


limiter = Limiter(key_func=_get_client_ip, default_limits=["120/minute"])

# Rate limit presets for different endpoint types
RATE_AUTH = "5/minute"        # Auth-related (login, token refresh) — strict to prevent brute-force
RATE_WRITE = "30/minute"      # Create/Update/Delete operations
RATE_READ = "120/minute"      # Read/List operations
RATE_WEBHOOK = "60/minute"    # Webhook endpoints
RATE_EMAIL = "10/minute"      # Email sending
RATE_EXPORT = "5/minute"      # CSV/PDF export operations
