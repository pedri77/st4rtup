"""AGENT-LEAD-001 — Lead Intelligence Agent.

Evalúa leads con scoring ICP usando LLM (Mistral Small 3 en vLLM o fallback a API).
Aplica HITL checkpoint cuando score está entre 40-70.

Pipeline:
  [Lead Data] → [Enrich if needed] → [PromptRegistry] → [LLM Call] → [Parse Score]
  → [AuditTrail] → [HITL Check] → [Update Lead]
"""
import json
import logging
import time
from uuid import UUID

import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.models.lead import Lead
from app.agents.registry import AgentDefinition, agent_registry
from app.agents.prompts import prompt_registry
from app.agents.audit import audit_trail

logger = logging.getLogger(__name__)

# ─── Agent Registration ──────────────────────────────────────────

AGENT_DEF = AgentDefinition(
    id="AGENT-LEAD-001",
    name="Lead Intelligence",
    model="mistral-small-3",
    description="Enriquecimiento ICP, scoring de leads basado en sector, tamaño, cargo y señales de compra",
    version="1.0.0",
    cost_per_run=0.002,  # ~$0.002 per call on vLLM
    metadata={"hitl_range": [40, 70]},
)

agent_registry.register(AGENT_DEF)


# ─── LLM Call ─────────────────────────────────────────────────────

async def _call_llm(system_prompt: str, user_prompt: str) -> dict:
    """Llama al LLM (vLLM self-hosted o fallback).

    Prioridad:
    1. vLLM en Hetzner (VLLM_BASE_URL)
    2. Mistral API (MISTRAL_API_KEY)
    3. OpenAI-compatible fallback (OPENAI_API_KEY)
    """
    # Try vLLM first (self-hosted, soberanía de datos)
    vllm_url = getattr(settings, "VLLM_BASE_URL", "") or ""
    if vllm_url:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    f"{vllm_url}/v1/chat/completions",
                    json={
                        "model": "mistral-small-3",
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                        "temperature": 0.1,
                        "max_tokens": 500,
                        "response_format": {"type": "json_object"},
                    },
                )
                if resp.status_code == 200:
                    data = resp.json()
                    content = data["choices"][0]["message"]["content"]
                    usage = data.get("usage", {})
                    return {
                        "content": content,
                        "tokens_in": usage.get("prompt_tokens", 0),
                        "tokens_out": usage.get("completion_tokens", 0),
                        "model": "mistral-small-3@vllm",
                    }
        except Exception as e:
            logger.warning("vLLM call failed, trying fallback: %s", e)

    # Fallback: Mistral API
    mistral_key = getattr(settings, "MISTRAL_API_KEY", "") or ""
    if mistral_key:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    "https://api.mistral.ai/v1/chat/completions",
                    json={
                        "model": "mistral-small-latest",
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                        "temperature": 0.1,
                        "max_tokens": 500,
                        "response_format": {"type": "json_object"},
                    },
                    headers={"Authorization": f"Bearer {mistral_key}"},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    content = data["choices"][0]["message"]["content"]
                    usage = data.get("usage", {})
                    return {
                        "content": content,
                        "tokens_in": usage.get("prompt_tokens", 0),
                        "tokens_out": usage.get("completion_tokens", 0),
                        "model": "mistral-small@api",
                    }
        except Exception as e:
            logger.warning("Mistral API call failed: %s", e)

    # Fallback: OpenAI-compatible
    openai_key = getattr(settings, "OPENAI_API_KEY", "") or getattr(settings, "OPEN_API_KEY", "") or ""
    if openai_key:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    json={
                        "model": "gpt-4o-mini",
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                        "temperature": 0.1,
                        "max_tokens": 500,
                        "response_format": {"type": "json_object"},
                    },
                    headers={"Authorization": f"Bearer {openai_key}"},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    content = data["choices"][0]["message"]["content"]
                    usage = data.get("usage", {})
                    return {
                        "content": content,
                        "tokens_in": usage.get("prompt_tokens", 0),
                        "tokens_out": usage.get("completion_tokens", 0),
                        "model": "gpt-4o-mini@openai",
                    }
        except Exception as e:
            logger.warning("OpenAI call failed: %s", e)

    return {"error": "No LLM provider configured (VLLM_BASE_URL, MISTRAL_API_KEY, or OPENAI_API_KEY)"}


# ─── Main Agent Function ─────────────────────────────────────────

async def score_lead(
    db: AsyncSession,
    lead_id: UUID,
    user_id: UUID | None = None,
) -> dict:
    """Ejecuta AGENT-LEAD-001 sobre un lead.

    Returns:
        {
            "icp_score": 0-100,
            "tier": "A"/"B"/"C"/"D",
            "reasoning": "...",
            "regulatory_frameworks": [...],
            "recommended_action": "qualify"/"nurture"/"discard",
            "hitl_required": bool,
            "model_used": "...",
            "audit_id": "..."
        }
    """
    if not agent_registry.is_available("AGENT-LEAD-001"):
        return {"error": "AGENT-LEAD-001 is not available"}

    start = time.time()

    # 1. Get lead data
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        return {"error": "Lead not found"}

    # 2. Get RAG context (if Qdrant configured)
    rag_context = ""
    try:
        from app.services.rag_service import get_lead_context
        rag_context = await get_lead_context(str(lead_id), f"información sobre {lead.company_name}")
    except Exception:
        pass

    # 3. Get prompts
    system_prompt = await prompt_registry.get_prompt("AGENT-LEAD-001", "system", db)
    user_template = await prompt_registry.get_prompt("AGENT-LEAD-001", "user_template", db)

    # 4. Format user prompt with lead data
    # GDPR/ENS Alto: anonymize PII when sending to external LLMs.
    # Personal contact data (name, email) is replaced with role/initials —
    # the LLM only needs business context (sector, size, role) to score.
    use_external_llm = bool(getattr(settings, "OPENAI_API_KEY", None) or getattr(settings, "ANTHROPIC_API_KEY", None))
    if use_external_llm:
        contact_name_for_llm = "[Contact]"
        contact_email_for_llm = "[redacted-email]"
    else:
        contact_name_for_llm = lead.contact_name or "Desconocido"
        contact_email_for_llm = lead.contact_email or "No disponible"

    user_prompt = user_template.format(
        company_name=lead.company_name or "Desconocida",
        sector=lead.company_sector or "No especificado",
        company_size=lead.company_size or "Desconocido",
        country=lead.company_country or "España",
        city=lead.company_city or "No especificada",
        contact_name=contact_name_for_llm,
        contact_title=lead.contact_title or "No especificado",
        contact_email=contact_email_for_llm,
        source=lead.source or "No especificada",
        website=lead.company_website or "No disponible",
        revenue=lead.company_revenue or "No disponible",
        enrichment_data=json.dumps(lead.enrichment_data or {}, ensure_ascii=False)[:500],
        current_score=lead.score or 0,
    )

    # Append RAG context if available
    if rag_context:
        user_prompt += f"\n\nContexto adicional (historial del lead):\n{rag_context}"

    # 5. Call LLM
    llm_result = await _call_llm(system_prompt, user_prompt)
    duration_ms = int((time.time() - start) * 1000)

    if "error" in llm_result:
        # Log failed execution
        await audit_trail.log(
            db=db, agent_id="AGENT-LEAD-001", model="none",
            input_data={"lead_id": str(lead_id)},
            output_data={"error": llm_result["error"]},
            duration_ms=duration_ms, success=False,
            error=llm_result["error"], lead_id=lead_id, user_id=user_id,
        )
        return llm_result

    # 5. Parse LLM response
    try:
        scoring = json.loads(llm_result["content"])
    except json.JSONDecodeError:
        scoring = {
            "icp_score": 50,
            "tier": "C",
            "reasoning": "Error parsing LLM response",
            "recommended_action": "nurture",
            "confidence": 0.0,
        }

    icp_score = min(100, max(0, int(scoring.get("icp_score", 50))))
    tier = scoring.get("tier", "C")

    # 6. HITL checkpoint: score 40-70 requires human review
    hitl_required = 40 <= icp_score <= 70

    # 7. Update lead score
    lead.score = icp_score
    if scoring.get("regulatory_frameworks"):
        enrichment = lead.enrichment_data or {}
        enrichment["agent_scoring"] = {
            "icp_score": icp_score,
            "tier": tier,
            "frameworks": scoring.get("regulatory_frameworks", []),
            "action": scoring.get("recommended_action"),
            "reasoning": scoring.get("reasoning", ""),
        }
        lead.enrichment_data = enrichment
    await db.commit()

    # 8. Audit trail
    audit_id = await audit_trail.log(
        db=db, agent_id="AGENT-LEAD-001",
        model=llm_result.get("model", "unknown"),
        input_data={"lead_id": str(lead_id), "company": lead.company_name},
        output_data=scoring,
        tokens_in=llm_result.get("tokens_in", 0),
        tokens_out=llm_result.get("tokens_out", 0),
        duration_ms=duration_ms,
        cost_estimate=AGENT_DEF.cost_per_run,
        success=True, lead_id=lead_id, user_id=user_id,
    )

    return {
        "icp_score": icp_score,
        "tier": tier,
        "reasoning": scoring.get("reasoning", ""),
        "regulatory_frameworks": scoring.get("regulatory_frameworks", []),
        "recommended_action": scoring.get("recommended_action", "nurture"),
        "confidence": scoring.get("confidence", 0.5),
        "hitl_required": hitl_required,
        "hitl_reason": "Score en rango 40-70: requiere revisión humana" if hitl_required else None,
        "model_used": llm_result.get("model"),
        "duration_ms": duration_ms,
        "audit_id": audit_id,
    }


async def bulk_score_leads(
    db: AsyncSession,
    lead_ids: list[UUID],
    user_id: UUID | None = None,
) -> dict:
    """Ejecuta scoring ICP sobre múltiples leads."""
    results = {"scored": 0, "failed": 0, "hitl_required": 0, "details": []}

    for lead_id in lead_ids:
        result = await score_lead(db, lead_id, user_id)
        if "error" in result:
            results["failed"] += 1
        else:
            results["scored"] += 1
            if result.get("hitl_required"):
                results["hitl_required"] += 1
        results["details"].append({"lead_id": str(lead_id), **result})

    return results
