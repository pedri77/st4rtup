"""AGENT-CS-001 — Customer Success Agent.

Analiza señales de NPS, churn y upsell usando datos de PostHog,
encuestas y actividad del CRM.

HITL-5: NPS ≥ 8 + señal de expansión → notificar founder (48h, opcional)
"""
import json
import logging
import time
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.lead import Lead
from app.agents.registry import AgentDefinition, agent_registry
from app.agents.prompts import prompt_registry, DEFAULTS
from app.agents.audit import audit_trail

logger = logging.getLogger(__name__)

# ─── Agent Registration ──────────────────────────────────────────

AGENT_DEF = AgentDefinition(
    id="AGENT-CS-001",
    name="Customer Success",
    model="phi-4",
    description="NPS analysis, señales upsell, churn detection",
    version="1.0.0",
    cost_per_run=0.001,
    metadata={"hitl_trigger": "nps_8_plus_expansion"},
)

agent_registry.register(AGENT_DEF)

# ─── Default Prompts ─────────────────────────────────────────────

DEFAULTS["AGENT-CS-001"] = {
    "system": """Eres un analista de Customer Success para St4rtup, una plataforma CRM y ventas para startups.

Analiza los datos del cliente y determina:
1. Nivel de satisfacción (basado en NPS, actividad, engagement)
2. Riesgo de churn (inactividad, tickets, bajo uso)
3. Oportunidades de upsell/expansion (crecimiento empresa, más usuarios, nuevos módulos)
4. Acciones recomendadas para el equipo de CS

Responde SIEMPRE en JSON:
{
  "health_score": <0-100>,
  "health_status": "healthy" | "at_risk" | "churning",
  "nps_analysis": "...",
  "churn_risk": <0-100>,
  "churn_signals": ["..."],
  "upsell_opportunities": ["..."],
  "expansion_potential": <0-100>,
  "recommended_actions": [
    {"action": "...", "priority": "high" | "medium" | "low", "timeline": "inmediato" | "esta_semana" | "este_mes"}
  ],
  "hitl_required": true|false,
  "hitl_reason": "..."
}""",
    "user_template": """Analiza este cliente:

Empresa: {company_name}
Sector: {sector}
Tamaño: {company_size}
País: {country}
Contacto: {contact_name} ({contact_title})
Score CRM: {score}/100

Datos de actividad (PostHog):
- Eventos últimos 14 días: {events_14d}
- Logins últimos 14 días: {logins_14d}
- Propuestas abiertas últimas 48h: {proposals_48h}
- Señales detectadas: {signals}
- Riesgo churn (auto): {churn_risk}%

Datos de encuestas:
- NPS más reciente: {nps_score}
- Comentario NPS: {nps_comment}

Datos del deal:
- Valor del deal: {deal_value}
- Tiempo como cliente: {customer_tenure}
- Módulos contratados: {modules}

Datos adicionales: {enrichment_data}""",
    "version": "1.0.0",
}


async def analyze_customer(
    db: AsyncSession,
    lead_id: UUID,
    nps_score: int | None = None,
    nps_comment: str = "",
    posthog_data: dict | None = None,
    user_id: UUID | None = None,
) -> dict:
    """Ejecuta AGENT-CS-001 sobre un cliente."""
    if not agent_registry.is_available("AGENT-CS-001"):
        return {"error": "AGENT-CS-001 is not available"}

    start = time.time()

    # Get lead
    result = await db.execute(select(Lead).where(Lead.id == lead_id))
    lead = result.scalar_one_or_none()
    if not lead:
        return {"error": "Lead not found"}

    # Get PostHog data if not provided
    if not posthog_data:
        from app.services.posthog_service import get_churn_signals
        posthog_data = await get_churn_signals(str(lead_id))

    # Get prompts
    system_prompt = await prompt_registry.get_prompt("AGENT-CS-001", "system", db)
    user_template = await prompt_registry.get_prompt("AGENT-CS-001", "user_template", db)

    enrichment = lead.enrichment_data or {}

    user_prompt = user_template.format(
        company_name=lead.company_name or "Desconocida",
        sector=lead.company_sector or "No especificado",
        company_size=lead.company_size or "No especificado",
        country=lead.company_country or "España",
        contact_name=lead.contact_name or "Desconocido",
        contact_title=lead.contact_title or "No especificado",
        score=lead.score or 0,
        events_14d=posthog_data.get("total_events_14d", "No disponible"),
        logins_14d=posthog_data.get("logins_14d", "No disponible"),
        proposals_48h=posthog_data.get("proposal_opens_48h", 0),
        signals=", ".join(posthog_data.get("signals", [])) or "Ninguna",
        churn_risk=posthog_data.get("churn_risk", "No calculado"),
        nps_score=nps_score if nps_score is not None else "No disponible",
        nps_comment=nps_comment or "Sin comentario",
        deal_value=enrichment.get("deal_value", "No disponible"),
        customer_tenure=enrichment.get("customer_tenure", "No disponible"),
        modules=enrichment.get("modules", "GRC básico"),
        enrichment_data=json.dumps(enrichment, ensure_ascii=False)[:300],
    )

    # Call LLM
    from app.agents.lead_intelligence import _call_llm
    llm_result = await _call_llm(system_prompt, user_prompt)
    duration_ms = int((time.time() - start) * 1000)

    if "error" in llm_result:
        await audit_trail.log(
            db=db, agent_id="AGENT-CS-001", model="none",
            input_data={"lead_id": str(lead_id)},
            output_data={"error": llm_result["error"]},
            duration_ms=duration_ms, success=False,
            error=llm_result["error"], lead_id=lead_id, user_id=user_id,
        )
        return llm_result

    try:
        analysis = json.loads(llm_result["content"])
    except json.JSONDecodeError:
        analysis = {
            "health_score": 50,
            "health_status": "at_risk",
            "churn_risk": 50,
            "recommended_actions": [{"action": "Revisar manualmente", "priority": "high", "timeline": "inmediato"}],
        }

    # HITL-5: NPS ≥ 8 + expansion potential > 60
    hitl_required = (
        (nps_score is not None and nps_score >= 8 and analysis.get("expansion_potential", 0) > 60)
        or analysis.get("hitl_required", False)
    )

    # Audit
    audit_id = await audit_trail.log(
        db=db, agent_id="AGENT-CS-001",
        model=llm_result.get("model", "unknown"),
        input_data={"lead_id": str(lead_id), "nps": nps_score},
        output_data=analysis,
        tokens_in=llm_result.get("tokens_in", 0),
        tokens_out=llm_result.get("tokens_out", 0),
        duration_ms=duration_ms,
        cost_estimate=AGENT_DEF.cost_per_run,
        success=True, lead_id=lead_id, user_id=user_id,
    )

    return {
        **analysis,
        "hitl_required": hitl_required,
        "hitl_reason": "NPS ≥ 8 + señal de expansión" if hitl_required else None,
        "model_used": llm_result.get("model"),
        "duration_ms": duration_ms,
        "audit_id": audit_id,
    }
