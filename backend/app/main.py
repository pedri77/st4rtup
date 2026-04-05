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


async def _auto_seed_and_activate():
    """Seed automations if DB is empty + activate all deployed ones.
    Runs on every startup to ensure new deploys have automations ready.
    """
    from sqlalchemy import select, func
    from app.models import Automation, AutomationStatus, AutomationImplStatus
    from app.api.v1.endpoints.automations import DEPLOYED_CODES

    async with AsyncSessionLocal() as db:
        from app.models.organization import Organization

        # Seed automations for all orgs that don't have them yet
        orgs = (await db.execute(select(Organization))).scalars().all()
        if not orgs:
            logger.warning("No organizations found — skipping auto-seed")
            return

        seed_data = _get_seed_data()
        total_seeded = 0
        for org in orgs:
            org_count = (await db.execute(select(func.count(Automation.id)).where(
                Automation.org_id == org.id
            ))).scalar() or 0

            if org_count == 0:
                # Seed all automations for this org
                for item in seed_data:
                    auto = Automation(**item, org_id=org.id)
                    if item["code"] in DEPLOYED_CODES:
                        auto.is_enabled = True
                        auto.status = AutomationStatus.ACTIVE
                        auto.impl_status = AutomationImplStatus.DEPLOYED
                    db.add(auto)
                total_seeded += len(seed_data)
                logger.info(f"✅ Auto-seeded {len(seed_data)} automations for org {org.id}")

        if total_seeded:
            await db.commit()

        # Activate newly deployed codes across all orgs
        result = await db.execute(
            select(Automation).where(
                Automation.code.in_(DEPLOYED_CODES),
                Automation.impl_status != AutomationImplStatus.DEPLOYED,
            )
        )
        to_activate = result.scalars().all()
        for auto in to_activate:
            auto.is_enabled = True
            auto.status = AutomationStatus.ACTIVE
            auto.impl_status = AutomationImplStatus.DEPLOYED
        if to_activate:
            await db.commit()
            codes = list(set(a.code for a in to_activate))
            logger.info(f"✅ Auto-activated {len(to_activate)} automations: {codes}")
        elif not total_seeded:
            logger.info(f"✅ All {len(DEPLOYED_CODES)} deployed automations already active")


def _get_seed_data() -> list:
    """Master seed data for all 22 automations. Single source of truth."""
    return [
        {"code": "EM-01", "name": "Secuencia Welcome", "description": "Secuencia de 3 emails automáticos para leads nuevos.", "category": "email_automation", "trigger_type": "webhook", "trigger_config": {"event": "lead.created"}, "priority": "critical", "complexity": "medium", "phase": "phase_1"},
        {"code": "EM-02", "name": "Tracking de Email", "description": "Webhook Resend para tracking opens/clicks/replies.", "category": "email_automation", "trigger_type": "webhook", "trigger_config": {"events": ["email.opened", "email.clicked"]}, "priority": "critical", "complexity": "low", "phase": "phase_1"},
        {"code": "EM-03", "name": "Re-engagement Automático", "description": "Reactivación semanal de leads inactivos >30 días.", "category": "email_automation", "trigger_type": "cron", "trigger_config": {"cron": "0 9 * * 1"}, "priority": "high", "complexity": "medium", "phase": "phase_4"},
        {"code": "EM-04", "name": "Follow-up Post-Visita", "description": "Email follow-up 24h después de visita positiva/follow_up.", "category": "email_automation", "trigger_type": "cron", "trigger_config": {"cron": "0 11 * * *"}, "priority": "high", "complexity": "low", "phase": "phase_2"},
        {"code": "LD-01", "name": "Webhook Formulario Web", "description": "Crea lead desde formulario web + notifica Telegram.", "category": "leads_captacion", "trigger_type": "webhook", "trigger_config": {"event": "form.submitted"}, "priority": "critical", "complexity": "low", "phase": "phase_1"},
        {"code": "LD-02", "name": "Sincronización Apollo.io", "description": "Sync diario de prospectos desde Apollo.io.", "category": "leads_captacion", "trigger_type": "cron", "trigger_config": {"cron": "0 8 * * *"}, "priority": "high", "complexity": "high", "phase": "phase_3"},
        {"code": "LD-03", "name": "Enriquecimiento Automático", "description": "Enriquece leads sin sector con datos Apollo/CNAE.", "category": "leads_captacion", "trigger_type": "webhook", "trigger_config": {"filter": "minimal_data"}, "priority": "medium", "complexity": "high", "phase": "phase_3"},
        {"code": "LD-04", "name": "Lead Scoring Automático", "description": "Recalcula score por reglas de sector, tamaño e interacción.", "category": "leads_captacion", "trigger_type": "event", "trigger_config": {"events": ["lead.updated"]}, "priority": "high", "complexity": "medium", "phase": "phase_1"},
        {"code": "VI-01", "name": "Auto-crear Acciones Post-Visita", "description": "Crea acciones de seguimiento según resultado de visita.", "category": "visitas", "trigger_type": "webhook", "trigger_config": {"event": "visit.created"}, "priority": "high", "complexity": "low", "phase": "phase_2"},
        {"code": "VI-02", "name": "Recordatorio Pre-Visita", "description": "Briefing 24h antes de visita programada.", "category": "visitas", "trigger_type": "cron", "trigger_config": {"cron": "0 8 * * *"}, "priority": "medium", "complexity": "medium", "phase": "phase_4"},
        {"code": "VI-03", "name": "Sync Google Calendar", "description": "Sincronización bidireccional con Google Calendar.", "category": "visitas", "trigger_type": "webhook", "trigger_config": {"bidirectional": True}, "priority": "medium", "complexity": "high", "phase": "phase_4"},
        {"code": "AC-01", "name": "Resumen Diario de Acciones", "description": "Resumen diario 08:30 de acciones pendientes/vencidas.", "category": "acciones_alertas", "trigger_type": "cron", "trigger_config": {"cron": "30 8 * * *"}, "priority": "critical", "complexity": "low", "phase": "phase_1"},
        {"code": "AC-02", "name": "Escalado Automático", "description": "Escala acciones vencidas >3 días con alerta.", "category": "acciones_alertas", "trigger_type": "cron", "trigger_config": {"cron": "0 9 * * *"}, "priority": "high", "complexity": "low", "phase": "phase_2"},
        {"code": "AC-03", "name": "Auto-cierre Acciones", "description": "Cierra acciones pendientes al completar email/visita.", "category": "acciones_alertas", "trigger_type": "event", "trigger_config": {"events": ["email.sent", "visit.created"]}, "priority": "medium", "complexity": "medium", "phase": "phase_4"},
        {"code": "PI-01", "name": "Triggers por Cambio de Etapa", "description": "Dispara acciones al cambiar stage de oportunidad.", "category": "pipeline", "trigger_type": "webhook", "trigger_config": {"event": "opportunity.stage_changed"}, "priority": "high", "complexity": "high", "phase": "phase_2"},
        {"code": "PI-02", "name": "Report Semanal Pipeline", "description": "Informe semanal con valor pipeline y forecast.", "category": "pipeline", "trigger_type": "cron", "trigger_config": {"cron": "0 8 * * 1"}, "priority": "high", "complexity": "medium", "phase": "phase_2"},
        {"code": "PI-03", "name": "Alerta Deal Estancado", "description": "Alerta deals sin actividad en 14 días.", "category": "pipeline", "trigger_type": "cron", "trigger_config": {"cron": "30 10 * * *"}, "priority": "high", "complexity": "medium", "phase": "phase_2"},
        {"code": "MR-01", "name": "Auto-generación Monthly Review", "description": "Genera monthly review por lead activo el día 1.", "category": "seguimiento_mensual", "trigger_type": "cron", "trigger_config": {"cron": "0 8 1 * *"}, "priority": "critical", "complexity": "high", "phase": "phase_3"},
        {"code": "MR-02", "name": "Informe Mensual Consolidado", "description": "Informe mensual con KPIs y comparativa.", "category": "seguimiento_mensual", "trigger_type": "cron", "trigger_config": {"cron": "0 9 1 * *"}, "priority": "high", "complexity": "high", "phase": "phase_3"},
        {"code": "SV-01", "name": "Encuesta Post-Cierre (NPS)", "description": "NPS 30 días después de closed_won.", "category": "encuestas", "trigger_type": "cron", "trigger_config": {"cron": "30 11 * * *"}, "priority": "high", "complexity": "high", "phase": "phase_4"},
        {"code": "SV-02", "name": "Encuesta Trimestral CSAT", "description": "CSAT trimestral a clientes activos.", "category": "encuestas", "trigger_type": "cron", "trigger_config": {"cron": "0 8 1 1,4,7,10 *"}, "priority": "medium", "complexity": "medium", "phase": "phase_4"},
        {"code": "IN-01", "name": "Importar Leads Scraping", "description": "Importa y deduplica leads desde scraping.", "category": "integraciones", "trigger_type": "webhook", "trigger_config": {"event": "lead.import_batch"}, "priority": "high", "complexity": "medium", "phase": "phase_3"},
        {"code": "IN-02", "name": "Notificaciones Telegram Hub", "description": "Bot Telegram centralizado para notificaciones.", "category": "integraciones", "trigger_type": "event", "trigger_config": {"channels": ["leads", "actions", "pipeline"]}, "priority": "high", "complexity": "medium", "phase": "phase_1"},
        # Sprint 2: External services
        {"code": "RS-054b", "name": "Brevo Nurturing", "description": "Leads ICP < 40 a lista nurturing automático Brevo.", "category": "integraciones", "trigger_type": "cron", "trigger_config": {"cron": "0 7 * * *"}, "priority": "medium", "complexity": "medium", "phase": "phase_2"},
        {"code": "RS-054c", "name": "Brevo Reactivation", "description": "Check leads dormant en Brevo por aperturas recientes.", "category": "integraciones", "trigger_type": "cron", "trigger_config": {"cron": "30 10 * * *"}, "priority": "medium", "complexity": "medium", "phase": "phase_2"},
        {"code": "RS-093", "name": "Lemlist Sync", "description": "Sync actividad campañas Lemlist → actualizar score leads.", "category": "integraciones", "trigger_type": "cron", "trigger_config": {"cron": "0 12 * * *"}, "priority": "medium", "complexity": "medium", "phase": "phase_2"},
        # Sprint 3: Event-driven
        {"code": "RS-092", "name": "FirstPromoter Webhook", "description": "Handle partner referrals y sales desde FirstPromoter.", "category": "integraciones", "trigger_type": "webhook", "trigger_config": {"event": "partner.event"}, "priority": "medium", "complexity": "medium", "phase": "phase_3"},
        # Sprint 4: New APIs
        {"code": "RS-045b", "name": "Clarity Enrichment", "description": "Sessions con product page views → incrementar score leads.", "category": "integraciones", "trigger_type": "cron", "trigger_config": {"cron": "0 14 * * *"}, "priority": "medium", "complexity": "medium", "phase": "phase_4"},
        {"code": "RS-045c", "name": "Metricool Social", "description": "Programar posts sociales via Metricool API.", "category": "integraciones", "trigger_type": "cron", "trigger_config": {"cron": "30 8 * * 1,3,5"}, "priority": "medium", "complexity": "medium", "phase": "phase_4"},
        {"code": "RS-033", "name": "Regulatory Trigger BOE/ENISA", "description": "Monitorizar BOE + ENISA RSS por publicaciones regulatorias.", "category": "integraciones", "trigger_type": "cron", "trigger_config": {"cron": "30 7 * * *"}, "priority": "high", "complexity": "medium", "phase": "phase_4"},
        {"code": "RS-094", "name": "Competitor Alerts", "description": "Detectar cambios en pricing/features de competidores.", "category": "integraciones", "trigger_type": "cron", "trigger_config": {"cron": "0 13 * * *"}, "priority": "medium", "complexity": "high", "phase": "phase_4"},
        # Sprint 5: Infrastructure
        {"code": "RS-076b", "name": "Cost Tracking", "description": "Monitorizar costes vs presupuesto, alertar si >80%.", "category": "integraciones", "trigger_type": "cron", "trigger_config": {"cron": "0 9 * * *"}, "priority": "high", "complexity": "low", "phase": "phase_5"},
        {"code": "RS-095", "name": "DB Backup Check", "description": "Verificar backup diario de la DB, alertar si falta.", "category": "integraciones", "trigger_type": "cron", "trigger_config": {"cron": "0 3 * * *"}, "priority": "critical", "complexity": "low", "phase": "phase_5"},
    ]


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

    # Auto-seed + activate deployed automations for all organizations
    try:
        await _auto_seed_and_activate()
    except Exception as e:
        logger.error(f"❌ Auto-seed automations failed: {e}")

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
