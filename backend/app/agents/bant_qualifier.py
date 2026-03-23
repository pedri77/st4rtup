"""AGENT-QUALIFY-001 — BANT Qualifier Agent.

Analiza transcripciones de llamadas (Retell AI) y evalúa BANT:
Budget, Authority, Need, Timeline.

Aplica HITL checkpoint cuando detecta objeción compleja.
"""
import json
import logging
import time
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.registry import AgentDefinition, agent_registry
from app.agents.prompts import prompt_registry
from app.agents.audit import audit_trail

logger = logging.getLogger(__name__)

# ─── Agent Registration ──────────────────────────────────────────

AGENT_DEF = AgentDefinition(
    id="AGENT-QUALIFY-001",
    name="BANT Qualifier",
    model="phi-4",
    description="Análisis de transcripciones de llamadas, BANT scoring, detección de objeciones",
    version="1.0.0",
    cost_per_run=0.001,
    metadata={"hitl_trigger": "complex_objection"},
)

agent_registry.register(AGENT_DEF)


async def qualify_call(
    db: AsyncSession,
    call_id: UUID | None = None,
    transcript: str = "",
    lead_id: UUID | None = None,
    user_id: UUID | None = None,
) -> dict:
    """Ejecuta AGENT-QUALIFY-001 sobre una transcripción de llamada.

    Args:
        call_id: ID de la llamada en el CRM (optional)
        transcript: Transcripción completa de la llamada
        lead_id: ID del lead asociado
        user_id: ID del usuario que ejecuta

    Returns:
        BANT scoring con objeciones y next steps.
    """
    if not agent_registry.is_available("AGENT-QUALIFY-001"):
        return {"error": "AGENT-QUALIFY-001 is not available"}

    if not transcript:
        return {"error": "No transcript provided"}

    start = time.time()

    # Get prompts
    system_prompt = await prompt_registry.get_prompt("AGENT-QUALIFY-001", "system", db)

    # Truncate very long transcripts
    if len(transcript) > 8000:
        transcript = transcript[:4000] + "\n\n[...transcripción truncada...]\n\n" + transcript[-4000:]

    user_prompt = f"Analiza esta transcripción de llamada:\n\n{transcript}"

    # Import LLM caller from lead_intelligence (same chain)
    from app.agents.lead_intelligence import _call_llm
    llm_result = await _call_llm(system_prompt, user_prompt)
    duration_ms = int((time.time() - start) * 1000)

    if "error" in llm_result:
        await audit_trail.log(
            db=db, agent_id="AGENT-QUALIFY-001", model="none",
            input_data={"call_id": str(call_id), "transcript_len": len(transcript)},
            output_data={"error": llm_result["error"]},
            duration_ms=duration_ms, success=False,
            error=llm_result["error"], lead_id=lead_id, user_id=user_id,
        )
        return llm_result

    # Parse response
    try:
        bant = json.loads(llm_result["content"])
    except json.JSONDecodeError:
        bant = {
            "bant_score": 50,
            "budget": {"score": 12, "evidence": "No determinado"},
            "authority": {"score": 12, "evidence": "No determinado"},
            "need": {"score": 12, "evidence": "No determinado"},
            "timeline": {"score": 12, "evidence": "No determinado"},
            "objections": [],
            "next_steps": ["Revisar manualmente"],
            "hitl_required": True,
            "hitl_reason": "Error parsing LLM response",
        }

    bant_score = min(100, max(0, int(bant.get("bant_score", 50))))
    hitl_required = bant.get("hitl_required", False)
    objections = bant.get("objections", [])

    # HITL-2: objection compleja → inmediato
    if objections and any(
        keyword in str(objections).lower()
        for keyword in ["precio", "competencia", "presupuesto", "no interesa", "ya tenemos"]
    ):
        hitl_required = True

    # Audit
    audit_id = await audit_trail.log(
        db=db, agent_id="AGENT-QUALIFY-001",
        model=llm_result.get("model", "unknown"),
        input_data={"call_id": str(call_id), "transcript_len": len(transcript)},
        output_data=bant,
        tokens_in=llm_result.get("tokens_in", 0),
        tokens_out=llm_result.get("tokens_out", 0),
        duration_ms=duration_ms,
        cost_estimate=AGENT_DEF.cost_per_run,
        success=True, lead_id=lead_id, user_id=user_id,
    )

    return {
        "bant_score": bant_score,
        "budget": bant.get("budget", {}),
        "authority": bant.get("authority", {}),
        "need": bant.get("need", {}),
        "timeline": bant.get("timeline", {}),
        "objections": objections,
        "next_steps": bant.get("next_steps", []),
        "hitl_required": hitl_required,
        "hitl_reason": bant.get("hitl_reason", "Objeción compleja detectada") if hitl_required else None,
        "model_used": llm_result.get("model"),
        "duration_ms": duration_ms,
        "audit_id": audit_id,
    }
