"""PromptRegistry — registro centralizado de prompts para agentes.

Permite versionar, actualizar y auditar prompts sin redespliegue.
Los prompts se almacenan en DB (SystemSettings) con fallback a defaults.
"""
import logging
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.system import SystemSettings

logger = logging.getLogger(__name__)

# ─── Default Prompts ──────────────────────────────────────────────

DEFAULTS: dict[str, dict] = {
    "AGENT-LEAD-001": {
        "system": """Eres un analista de ventas B2B especializado en startups y growth.
Tu trabajo es evaluar leads para St4rtup CRM, una plataforma SaaS de ventas y marketing
para startups de cualquier sector.

Evalúa cada lead en base a:
1. Sector: ¿Es una startup o empresa en crecimiento? (SaaS, fintech, healthtech, etc. = alta prioridad)
2. Tamaño: ¿Tiene la escala para necesitar un CRM? (5-500 empleados ideal)
3. Geografía: ¿Está en España o Europa? (mercado objetivo)
4. Cargo del contacto: ¿Tiene poder de decisión? (CEO, CTO, VP Sales, Head of Growth = ideal)
5. Señales de compra: ¿Hay indicios de necesidad urgente? (ronda de inversión, escalando equipo, sin CRM actual)

Responde SIEMPRE en JSON con este formato:
{
  "icp_score": <0-100>,
  "tier": "A" | "B" | "C" | "D",
  "reasoning": "<explicación breve>",
  "regulatory_frameworks": ["ENS", "NIS2", ...],
  "recommended_action": "qualify" | "nurture" | "discard",
  "confidence": <0.0-1.0>
}""",
        "user_template": """Evalúa este lead:

Empresa: {company_name}
Sector: {sector}
Tamaño: {company_size} empleados
País: {country}
Ciudad: {city}
Contacto: {contact_name}
Cargo: {contact_title}
Email: {contact_email}
Fuente: {source}
Website: {website}
Ingresos: {revenue}
Datos adicionales: {enrichment_data}

Score actual en CRM: {current_score}/100""",
        "version": "1.0.0",
    },
    "AGENT-QUALIFY-001": {
        "system": """Eres un analista de cualificación BANT especializado en ventas B2B para startups.
Analiza transcripciones de llamadas y evalúa:
- Budget: ¿Tiene presupuesto asignado para herramientas de ventas/CRM?
- Authority: ¿El contacto tiene autoridad para decidir?
- Need: ¿Hay una necesidad real y urgente?
- Timeline: ¿Cuándo necesitan implementar?

Responde en JSON:
{
  "bant_score": <0-100>,
  "budget": {"score": <0-25>, "evidence": "..."},
  "authority": {"score": <0-25>, "evidence": "..."},
  "need": {"score": <0-25>, "evidence": "..."},
  "timeline": {"score": <0-25>, "evidence": "..."},
  "objections": ["..."],
  "next_steps": ["..."],
  "hitl_required": true|false,
  "hitl_reason": "..."
}""",
        "version": "1.0.0",
    },
}


class PromptRegistry:
    """Registry for agent prompts with DB persistence and defaults fallback."""

    @staticmethod
    async def get_prompt(
        agent_id: str,
        prompt_type: str = "system",
        db: Optional[AsyncSession] = None,
    ) -> str:
        """Get prompt for an agent. Checks DB first, falls back to defaults."""
        # Try DB
        if db:
            try:
                result = await db.execute(select(SystemSettings).limit(1))
                settings = result.scalar_one_or_none()
                if settings and settings.general_config:
                    prompts = settings.general_config.get("agent_prompts", {})
                    agent_prompts = prompts.get(agent_id, {})
                    if prompt_type in agent_prompts:
                        return agent_prompts[prompt_type]
            except Exception as e:
                logger.warning("Error reading prompt from DB: %s", e)

        # Fallback to defaults
        default = DEFAULTS.get(agent_id, {})
        return default.get(prompt_type, "")

    @staticmethod
    async def update_prompt(
        agent_id: str,
        prompt_type: str,
        content: str,
        db: AsyncSession,
    ) -> bool:
        """Update a prompt in DB (survives redeployments)."""
        try:
            result = await db.execute(select(SystemSettings).limit(1))
            settings = result.scalar_one_or_none()
            if not settings:
                return False

            config = settings.general_config or {}
            prompts = config.get("agent_prompts", {})
            if agent_id not in prompts:
                prompts[agent_id] = {}
            prompts[agent_id][prompt_type] = content
            config["agent_prompts"] = prompts
            settings.general_config = config
            await db.commit()
            logger.info("Prompt updated: %s/%s", agent_id, prompt_type)
            return True
        except Exception as e:
            logger.error("Error updating prompt: %s", e)
            return False

    @staticmethod
    def get_default(agent_id: str, prompt_type: str = "system") -> str:
        """Get default prompt (no DB lookup)."""
        return DEFAULTS.get(agent_id, {}).get(prompt_type, "")


prompt_registry = PromptRegistry()
