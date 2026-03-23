"""
MCP Audit Trail — registra cada tool call de los agentes IA.
Cumple CONST-02 (ENS Alto): input_summary no contiene datos sensibles (PII, tokens).
"""
import time
import logging
import re
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

logger = logging.getLogger(__name__)

# PII patterns to redact from input summaries
PII_PATTERNS = [
    (re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'), '[EMAIL]'),
    (re.compile(r'\b\d{8,11}\b'), '[PHONE]'),
    (re.compile(r'\b[A-Z]\d{7,8}[A-Z]?\b'), '[DNI/CIF]'),
    (re.compile(r'(sk_|re_|pat-|xoxb-|Bearer\s+ey)[A-Za-z0-9_-]+'), '[TOKEN]'),
]


def _redact_pii(text_input: str) -> str:
    """Elimina PII de un texto para almacenar en audit trail."""
    result = text_input
    for pattern, replacement in PII_PATTERNS:
        result = pattern.sub(replacement, result)
    return result[:500]  # Limit length


async def log_tool_call(
    db: AsyncSession,
    server: str,
    tool: str,
    input_summary: str = "",
    outcome: str = "success",
    error_message: str = "",
    duration_ms: int = 0,
    agent_id: str = "",
    user_id: str = "",
    tenant_id: str = "default",
    metadata: dict = None,
):
    """Registra una llamada de herramienta en el audit trail."""
    safe_summary = _redact_pii(input_summary) if input_summary else ""
    try:
        import json
        await db.execute(text(
            "INSERT INTO mcp_audit_trail (id, tenant_id, agent_id, server, tool, input_summary, "
            "outcome, error_message, duration_ms, user_id, metadata) "
            "VALUES (gen_random_uuid(), :tenant_id, :agent_id, :server, :tool, :input_summary, "
            ":outcome, :error_message, :duration_ms, :user_id, :metadata)"
        ), {
            "tenant_id": tenant_id, "agent_id": agent_id, "server": server,
            "tool": tool, "input_summary": safe_summary, "outcome": outcome,
            "error_message": error_message[:500] if error_message else None,
            "duration_ms": duration_ms, "user_id": user_id or None,
            "metadata": json.dumps(metadata) if metadata else None,
        })
        await db.commit()
    except Exception as e:
        logger.warning("MCP audit log failed: %s", e)


class ToolCallTimer:
    """Context manager para medir duracion de tool calls."""
    def __init__(self):
        self.start = 0
        self.duration_ms = 0

    def __enter__(self):
        self.start = time.time()
        return self

    def __exit__(self, *args):
        self.duration_ms = int((time.time() - self.start) * 1000)
