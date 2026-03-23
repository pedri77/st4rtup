"""AgentRegistry — registro centralizado de agentes disponibles.

Patrón reutilizado de RAE v1. Cada agente se registra con su ID,
modelo, estado y metadata. Permite descubrimiento y gestión.
"""
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any

logger = logging.getLogger(__name__)


class AgentStatus(str, Enum):
    ACTIVE = "active"
    DISABLED = "disabled"
    ERROR = "error"
    MAINTENANCE = "maintenance"


@dataclass
class AgentDefinition:
    id: str                          # AGENT-LEAD-001
    name: str                        # Lead Intelligence
    model: str                       # mistral-small-3
    description: str
    version: str = "1.0.0"
    status: AgentStatus = AgentStatus.ACTIVE
    max_concurrent: int = 5
    timeout_seconds: int = 60
    cost_per_run: float = 0.0        # Estimated cost for GuardrailEvaluator
    metadata: dict = field(default_factory=dict)
    registered_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class AgentRegistry:
    """Singleton registry for all LangGraph agents."""

    _instance = None
    _agents: dict[str, AgentDefinition] = {}

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._agents = {}
        return cls._instance

    def register(self, agent: AgentDefinition) -> None:
        self._agents[agent.id] = agent
        logger.info("Agent registered: %s (%s)", agent.id, agent.name)

    def get(self, agent_id: str) -> AgentDefinition | None:
        return self._agents.get(agent_id)

    def list_agents(self) -> list[dict[str, Any]]:
        return [
            {
                "id": a.id,
                "name": a.name,
                "model": a.model,
                "status": a.status.value,
                "version": a.version,
                "description": a.description,
                "cost_per_run": a.cost_per_run,
            }
            for a in self._agents.values()
        ]

    def is_available(self, agent_id: str) -> bool:
        agent = self._agents.get(agent_id)
        return agent is not None and agent.status == AgentStatus.ACTIVE

    def set_status(self, agent_id: str, status: AgentStatus) -> None:
        agent = self._agents.get(agent_id)
        if agent:
            agent.status = status
            logger.info("Agent %s status → %s", agent_id, status.value)


# Global singleton
agent_registry = AgentRegistry()
