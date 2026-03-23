"""AGENT-PROPOSAL-001 — Proposal Generator Agent.

Genera propuestas comerciales personalizadas basadas en:
- Datos del lead (sector, tamaño, regulaciones)
- Resultado del scoring ICP (AGENT-LEAD-001)
- Resultado BANT (AGENT-QUALIFY-001)
- Templates de propuesta

Output: texto estructurado que puede convertirse a PDF/DOCX.
"""
import json
import logging
import time
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.lead import Lead
from app.models.pipeline import Opportunity
from app.agents.registry import AgentDefinition, agent_registry
from app.agents.prompts import prompt_registry, DEFAULTS
from app.agents.audit import audit_trail

logger = logging.getLogger(__name__)

# ─── Agent Registration ──────────────────────────────────────────

AGENT_DEF = AgentDefinition(
    id="AGENT-PROPOSAL-001",
    name="Proposal Generator",
    model="mistral-small-3",
    description="Generación de propuestas comerciales personalizadas PDF/DOCX",
    version="1.0.0",
    cost_per_run=0.005,
    timeout_seconds=120,
    metadata={"output_formats": ["json", "markdown"]},
)

agent_registry.register(AGENT_DEF)

# ─── Default Prompts ─────────────────────────────────────────────

DEFAULTS["AGENT-PROPOSAL-001"] = {
    "system": """Eres un generador de propuestas comerciales para St4rtup, una plataforma CRM y ventas para startups.

Genera propuestas profesionales y personalizadas en formato Markdown con esta estructura:

# Propuesta Comercial — St4rtup para {empresa}

## 1. Resumen Ejecutivo
Breve párrafo personalizado al sector y necesidades del cliente.

## 2. Contexto de Mercado
Oportunidades y retos del sector del cliente.
Por qué necesitan actuar ahora.

## 3. Solución Propuesta
- Módulos de St4rtup aplicables
- Funcionalidades clave para su caso
- Integraciones relevantes

## 4. Plan de Implementación
| Fase | Duración | Actividades |
|------|----------|-------------|
| PoC | 90 días | ... |
| Rollout | 60 días | ... |
| Optimización | Continuo | ... |

## 5. Inversión
| Concepto | Importe |
|----------|---------|
| Licencia anual | €X |
| Implementación | €X |
| Soporte premium | €X |
| **Total año 1** | **€X** |

## 6. Próximos Pasos
1. Reunión de kick-off
2. Acceso a entorno PoC
3. Hitos y criterios de éxito

Responde SIEMPRE en Markdown válido. Personaliza al máximo con los datos del lead.
Si no tienes datos suficientes, usa valores razonables para empresas del sector indicado en España.
El ACV de referencia es €19.500 para un PoC de 90 días, ajusta según tamaño de empresa.""",
    "user_template": """Genera una propuesta comercial para:

Empresa: {company_name}
Sector: {sector}
Tamaño: {company_size}
País: {country}
Ciudad: {city}
Contacto: {contact_name} ({contact_title})
Website: {website}
Ingresos estimados: {revenue}

Datos de scoring ICP:
- Score: {icp_score}/100
- Tier: {tier}
- Frameworks regulatorios: {frameworks}

Datos BANT (si disponibles):
{bant_data}

Oportunidad:
- Nombre: {opportunity_name}
- Valor estimado: {deal_value}
- Etapa actual: {stage}

Notas adicionales: {notes}""",
    "version": "1.0.0",
}


async def generate_proposal(
    db: AsyncSession,
    opportunity_id: UUID | None = None,
    lead_id: UUID | None = None,
    notes: str = "",
    user_id: UUID | None = None,
) -> dict:
    """Genera una propuesta comercial personalizada."""
    if not agent_registry.is_available("AGENT-PROPOSAL-001"):
        return {"error": "AGENT-PROPOSAL-001 is not available"}

    start = time.time()

    # Gather data
    lead = None
    opportunity = None

    if lead_id:
        result = await db.execute(select(Lead).where(Lead.id == lead_id))
        lead = result.scalar_one_or_none()

    if opportunity_id:
        result = await db.execute(select(Opportunity).where(Opportunity.id == opportunity_id))
        opportunity = result.scalar_one_or_none()
        if opportunity and not lead and opportunity.lead_id:
            result = await db.execute(select(Lead).where(Lead.id == opportunity.lead_id))
            lead = result.scalar_one_or_none()

    if not lead:
        return {"error": "Lead not found — provide lead_id or opportunity with lead_id"}

    # Load Brand config for dynamic proposal content
    from app.models.brand import BrandConfig
    brand_result = await db.execute(select(BrandConfig).limit(1))
    brand = brand_result.scalar_one_or_none()
    brand_name = brand.company_name if brand else "St4rtup"
    brand_frameworks = ", ".join(brand.regulatory_frameworks or []) if brand else ""

    # Load Pricing for the deal
    pricing_info = "ACV de referencia: €19.500 (PoC 90 días)"
    if opportunity and opportunity.pricing_tier:
        from app.models.pricing import PricingTier
        tier_result = await db.execute(select(PricingTier).where(PricingTier.slug == opportunity.pricing_tier))
        tier = tier_result.scalar_one_or_none()
        if tier:
            pricing_info = f"Tier: {tier.name} | Base: €{tier.base_price:,.0f}/{tier.price_unit}"
            if opportunity.pricing_calculated:
                pricing_info += f" | Precio deal: €{opportunity.pricing_calculated:,.0f}"
            if opportunity.pricing_modules:
                pricing_info += f" | Módulos: {', '.join(opportunity.pricing_modules)}"

    # Load Competitor context
    competitor_context = ""
    if opportunity and opportunity.competitor_id:
        from app.models.competitor import Competitor
        comp_result = await db.execute(select(Competitor).where(Competitor.id == opportunity.competitor_id))
        comp = comp_result.scalar_one_or_none()
        if comp:
            competitor_context = f"\nCompetidor principal: {comp.name} ({comp.price_range})\nDebilidades del competidor: {', '.join(comp.weaknesses or [])}\nNuestras ventajas: {comp.differentiators or ''}"

    # Extract enrichment data
    enrichment = lead.enrichment_data or {}
    agent_scoring = enrichment.get("agent_scoring", {})

    # Get prompts
    system_prompt = await prompt_registry.get_prompt("AGENT-PROPOSAL-001", "system", db)
    user_template = await prompt_registry.get_prompt("AGENT-PROPOSAL-001", "user_template", db)

    user_prompt = user_template.format(
        company_name=lead.company_name or "Empresa",
        sector=lead.company_sector or "Tecnología",
        company_size=lead.company_size or "No especificado",
        country=lead.company_country or "España",
        city=lead.company_city or "Madrid",
        contact_name=lead.contact_name or "Responsable",
        contact_title=lead.contact_title or "Director",
        website=lead.company_website or "No disponible",
        revenue=lead.company_revenue or "No disponible",
        icp_score=agent_scoring.get("icp_score", lead.score or 50),
        tier=agent_scoring.get("tier", "B"),
        frameworks=", ".join(agent_scoring.get("frameworks", [])),
        bant_data=json.dumps(enrichment.get("bant_scoring", {}), ensure_ascii=False) or "No disponible",
        opportunity_name=opportunity.name if opportunity else "Proyecto CRM",
        deal_value=f"€{opportunity.value:,.0f}" if opportunity and opportunity.value else "€19.500 (referencia)",
        stage=opportunity.stage.value if opportunity and opportunity.stage else "Propuesta",
        notes=notes or "Sin notas adicionales",
    )

    # Append dynamic context from Brand, Pricing, Competitor
    user_prompt += f"\n\nEmpresa que propone: {brand_name}"
    user_prompt += f"\nFrameworks cubiertos por {brand_name}: {brand_frameworks}"
    user_prompt += f"\nPricing: {pricing_info}"
    if competitor_context:
        user_prompt += f"\n{competitor_context}"

    # Call LLM
    from app.agents.lead_intelligence import _call_llm
    llm_result = await _call_llm(system_prompt, user_prompt)
    duration_ms = int((time.time() - start) * 1000)

    if "error" in llm_result:
        await audit_trail.log(
            db=db, agent_id="AGENT-PROPOSAL-001", model="none",
            input_data={"lead_id": str(lead_id), "opportunity_id": str(opportunity_id)},
            output_data={"error": llm_result["error"]},
            duration_ms=duration_ms, success=False,
            error=llm_result["error"], lead_id=lead_id, user_id=user_id,
        )
        return llm_result

    proposal_markdown = llm_result["content"]

    # Audit
    audit_id = await audit_trail.log(
        db=db, agent_id="AGENT-PROPOSAL-001",
        model=llm_result.get("model", "unknown"),
        input_data={"lead": lead.company_name, "opportunity": opportunity.name if opportunity else None},
        output_data={"length": len(proposal_markdown)},
        tokens_in=llm_result.get("tokens_in", 0),
        tokens_out=llm_result.get("tokens_out", 0),
        duration_ms=duration_ms,
        cost_estimate=AGENT_DEF.cost_per_run,
        success=True, lead_id=lead_id, user_id=user_id,
    )

    return {
        "proposal_markdown": proposal_markdown,
        "company": lead.company_name,
        "contact": lead.contact_name,
        "model_used": llm_result.get("model"),
        "duration_ms": duration_ms,
        "audit_id": audit_id,
    }
