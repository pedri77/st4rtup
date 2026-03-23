"""Tests para el sistema de agentes LLM."""
import pytest


@pytest.mark.asyncio
async def test_list_agents(client):
    """GET /agents/ — lista agentes registrados."""
    resp = await client.get("/api/v1/agents/")
    assert resp.status_code == 200
    data = resp.json()
    assert "agents" in data
    agents = data["agents"]
    assert len(agents) >= 3  # LEAD-001, QUALIFY-001, PROPOSAL-001 at minimum
    # Check structure
    for agent in agents:
        assert "id" in agent
        assert "name" in agent
        assert "model" in agent
        assert "status" in agent


@pytest.mark.asyncio
async def test_list_agents_has_lead_intelligence(client):
    """AGENT-LEAD-001 debe estar registrado."""
    resp = await client.get("/api/v1/agents/")
    agents = resp.json()["agents"]
    ids = [a["id"] for a in agents]
    assert "AGENT-LEAD-001" in ids


@pytest.mark.asyncio
async def test_list_agents_has_bant_qualifier(client):
    """AGENT-QUALIFY-001 debe estar registrado."""
    resp = await client.get("/api/v1/agents/")
    agents = resp.json()["agents"]
    ids = [a["id"] for a in agents]
    assert "AGENT-QUALIFY-001" in ids


@pytest.mark.asyncio
async def test_list_agents_has_proposal_generator(client):
    """AGENT-PROPOSAL-001 debe estar registrado."""
    resp = await client.get("/api/v1/agents/")
    agents = resp.json()["agents"]
    ids = [a["id"] for a in agents]
    assert "AGENT-PROPOSAL-001" in ids


@pytest.mark.asyncio
async def test_list_agents_has_customer_success(client):
    """AGENT-CS-001 debe estar registrado."""
    resp = await client.get("/api/v1/agents/")
    agents = resp.json()["agents"]
    ids = [a["id"] for a in agents]
    assert "AGENT-CS-001" in ids


@pytest.mark.asyncio
async def test_get_agent_audit_empty(client):
    """GET /agents/audit — audit trail vacío al inicio."""
    resp = await client.get("/api/v1/agents/audit")
    assert resp.status_code == 200
    data = resp.json()
    assert "entries" in data


@pytest.mark.asyncio
async def test_get_prompts_lead_intelligence(client):
    """GET /agents/prompts/AGENT-LEAD-001 — devuelve prompts default."""
    resp = await client.get("/api/v1/agents/prompts/AGENT-LEAD-001")
    assert resp.status_code == 200
    data = resp.json()
    assert data["agent_id"] == "AGENT-LEAD-001"
    assert "system" in data
    assert len(data["system"]) > 50  # Has content
    assert "St4rtup" in data["system"]


@pytest.mark.asyncio
async def test_get_prompts_unknown_agent(client):
    """GET /agents/prompts/UNKNOWN — devuelve vacío, no 500."""
    resp = await client.get("/api/v1/agents/prompts/UNKNOWN")
    assert resp.status_code == 200
    data = resp.json()
    assert data["system"] == ""


@pytest.mark.asyncio
async def test_score_lead_not_found(client):
    """POST /agents/lead-intelligence/{id} — 404 si lead no existe."""
    resp = await client.post("/api/v1/agents/lead-intelligence/00000000-0000-0000-0000-000000000001")
    assert resp.status_code == 200  # Returns error in body, not HTTP error
    data = resp.json()
    assert "error" in data


@pytest.mark.asyncio
async def test_bant_no_transcript(client):
    """POST /agents/bant-qualifier — error si no hay transcript."""
    resp = await client.post("/api/v1/agents/bant-qualifier", json={"transcript": ""})
    assert resp.status_code == 200
    data = resp.json()
    assert "error" in data


@pytest.mark.asyncio
async def test_proposal_no_ids(client):
    """POST /agents/proposal-generator — 400 sin opportunity_id ni lead_id."""
    resp = await client.post("/api/v1/agents/proposal-generator", json={"notes": "test"})
    assert resp.status_code == 400


@pytest.mark.asyncio
async def test_customer_success_no_lead(client):
    """POST /agents/customer-success — error si lead no existe."""
    resp = await client.post("/api/v1/agents/customer-success", json={
        "lead_id": "00000000-0000-0000-0000-000000000001"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "error" in data
