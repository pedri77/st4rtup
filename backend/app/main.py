from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import logging

from sqlalchemy import text

from app.core.config import settings
from app.core.database import engine, AsyncSessionLocal, Base
from app.api.v1.router import api_router
from app.core.scheduler import init_scheduler, start_scheduler, shutdown_scheduler
from app.core.rate_limit import limiter, _rate_limit_exceeded_handler, RateLimitExceeded
import app.models  # noqa: ensure all models are registered
import app.agents.lead_intelligence  # noqa: register AGENT-LEAD-001
import app.agents.bant_qualifier  # noqa: register AGENT-QUALIFY-001
import app.agents.proposal_generator  # noqa: register AGENT-PROPOSAL-001
import app.agents.customer_success  # noqa: register AGENT-CS-001

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for FastAPI
    Handles startup and shutdown events
    """
    # Startup
    logger.info("🚀 Starting St4rtup CRM API...")

    # Create all database tables
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("✅ Database tables created/verified")
    except Exception as e:
        logger.error(f"❌ Failed to create database tables: {type(e).__name__}: {repr(e)}", exc_info=True)

    # Initialize and start scheduler
    try:
        init_scheduler()
        start_scheduler()
        logger.info("✅ Automation scheduler initialized")
    except Exception as e:
        logger.error(f"❌ Failed to initialize scheduler: {e}")

    yield

    # Shutdown
    logger.info("🛑 Shutting down St4rtup CRM API...")
    try:
        shutdown_scheduler()
        logger.info("✅ Automation scheduler stopped")
    except Exception as e:
        logger.error(f"❌ Failed to stop scheduler: {e}")


_is_production = settings.APP_ENV == "production"

app = FastAPI(
    title="St4rtup CRM API",
    description="API de Gestión Comercial para St4rtup CRM",
    version="1.0.0",
    docs_url=None if _is_production else "/docs",
    redoc_url=None if _is_production else "/redoc",
    lifespan=lifespan,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
)

# Security headers
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        if _is_production:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

app.add_middleware(SecurityHeadersMiddleware)

# Global exception handler — ensures CORS headers are present even on 500
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    origin = request.headers.get("origin", "")
    allowed = settings.cors_origins
    cors_origin = origin if origin in allowed else (allowed[0] if allowed else "*")
    logger.error(f"Unhandled exception on {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
        headers={
            "Access-Control-Allow-Origin": cors_origin,
            "Access-Control-Allow-Credentials": "true",
        },
    )

# Routes
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.websocket("/ws/logs")
async def websocket_logs(websocket: WebSocket):
    """WebSocket endpoint for real-time admin log streaming."""
    await websocket.accept()
    import asyncio, subprocess
    try:
        # Verify admin token from query param
        token = websocket.query_params.get("token", "")
        if token:
            from app.core.security import get_current_user
            from fastapi.security import HTTPAuthorizationCredentials
            try:
                creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
                user = await get_current_user(creds)
                if user.get("role") != "admin":
                    await websocket.close(code=4003, reason="Admin required")
                    return
            except Exception:
                await websocket.close(code=4001, reason="Invalid token")
                return
        else:
            await websocket.close(code=4001, reason="Token required")
            return

        # Stream journalctl in real-time
        proc = await asyncio.create_subprocess_exec(
            "journalctl", "-u", "st4rtup", "-f", "-n", "0", "--no-pager",
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
        )
        while True:
            line = await asyncio.wait_for(proc.stdout.readline(), timeout=30)
            if line:
                await websocket.send_text(line.decode("utf-8", errors="replace").strip())
            else:
                await websocket.send_text("")  # keepalive
    except (WebSocketDisconnect, asyncio.TimeoutError):
        pass
    except Exception as e:
        logger.debug(f"WS logs closed: {e}")
    finally:
        try:
            proc.terminate()
        except Exception:
            pass


@app.get("/health")
async def health_check():
    checks = {}
    healthy = True

    # Database
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        checks["database"] = "connected"
    except Exception as e:
        checks["database"] = f"disconnected: {str(e)[:100]}"
        healthy = False

    # LLM
    from app.core.config import settings as app_settings
    llm_available = bool(
        getattr(app_settings, "MISTRAL_API_KEY", "") or
        getattr(app_settings, "OPENAI_API_KEY", "") or
        getattr(app_settings, "OPEN_API_KEY", "") or
        getattr(app_settings, "VLLM_BASE_URL", "")
    )
    checks["llm"] = "available" if llm_available else "not_configured"

    # Agents
    from app.agents.registry import agent_registry
    checks["agents"] = len(agent_registry.list_agents())

    # Integrations
    checks["integrations"] = {
        "telegram": bool(getattr(app_settings, "TELEGRAM_BOT_TOKEN", "")),
        "apollo": bool(getattr(app_settings, "APOLLO_API_KEY", "")),
        "brevo": bool(getattr(app_settings, "BREVO_API_KEY", "")),
        "posthog": bool(getattr(app_settings, "POSTHOG_HOST", "")),
        "slack": bool(getattr(app_settings, "SLACK_WEBHOOK_URL", "") or getattr(app_settings, "SLACK_BOT_TOKEN", "")),
        "teams": bool(getattr(app_settings, "TEAMS_WEBHOOK_URL", "")),
        "hunter": bool(getattr(app_settings, "HUNTER_API_KEY", "")),
        "whatsapp": bool(getattr(app_settings, "WHATSAPP_ACCESS_TOKEN", "")),
        "vllm": bool(getattr(app_settings, "VLLM_API_URL", "")),
    }

    if healthy:
        return {"status": "healthy", "checks": checks}
    return JSONResponse(status_code=503, content={"status": "unhealthy", "checks": checks})
