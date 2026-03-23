"""AgentAuditTrail — logging de ejecuciones de agentes.

Registra cada ejecución con input, output, modelo, coste y duración.
Patrón reutilizado de RAE v1.
"""
import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.system import SystemSettings

logger = logging.getLogger(__name__)


@dataclass
class AuditEntry:
    id: str
    agent_id: str
    model: str
    input_summary: str
    output_summary: str
    tokens_in: int
    tokens_out: int
    duration_ms: int
    cost_estimate: float
    success: bool
    error: str | None
    lead_id: str | None
    user_id: str | None
    timestamp: str


class AgentAuditTrail:
    """Logs agent executions to DB (general_config.agent_audit_log)."""

    @staticmethod
    async def log(
        db: AsyncSession,
        agent_id: str,
        model: str,
        input_data: dict,
        output_data: dict,
        tokens_in: int = 0,
        tokens_out: int = 0,
        duration_ms: int = 0,
        cost_estimate: float = 0.0,
        success: bool = True,
        error: str | None = None,
        lead_id: UUID | None = None,
        user_id: UUID | None = None,
    ) -> str:
        """Log an agent execution. Returns audit entry ID."""
        entry_id = str(uuid4())[:8]

        entry = {
            "id": entry_id,
            "agent_id": agent_id,
            "model": model,
            "input_summary": str(input_data)[:500],
            "output_summary": str(output_data)[:500],
            "tokens_in": tokens_in,
            "tokens_out": tokens_out,
            "duration_ms": duration_ms,
            "cost_estimate": cost_estimate,
            "success": success,
            "error": error,
            "lead_id": str(lead_id) if lead_id else None,
            "user_id": str(user_id) if user_id else None,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        try:
            result = await db.execute(select(SystemSettings).limit(1))
            settings = result.scalar_one_or_none()
            if settings:
                config = settings.general_config or {}
                audit_log = config.get("agent_audit_log", [])
                # Keep last 500 entries
                audit_log.append(entry)
                if len(audit_log) > 500:
                    audit_log = audit_log[-500:]
                config["agent_audit_log"] = audit_log
                settings.general_config = config
                await db.commit()
        except Exception as e:
            logger.error("Failed to log agent audit: %s", e)

        return entry_id

    @staticmethod
    async def get_recent(
        db: AsyncSession,
        agent_id: str | None = None,
        limit: int = 50,
    ) -> list[dict]:
        """Get recent audit entries, optionally filtered by agent."""
        try:
            result = await db.execute(select(SystemSettings).limit(1))
            settings = result.scalar_one_or_none()
            if not settings or not settings.general_config:
                return []

            entries = settings.general_config.get("agent_audit_log", [])
            if agent_id:
                entries = [e for e in entries if e.get("agent_id") == agent_id]
            return entries[-limit:][::-1]  # Most recent first
        except Exception as e:
            logger.error("Failed to read agent audit: %s", e)
            return []


audit_trail = AgentAuditTrail()
