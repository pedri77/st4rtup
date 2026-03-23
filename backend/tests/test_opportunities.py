"""Tests para el endpoint de opportunities."""
import pytest


@pytest.fixture
def opportunity_data(created_lead):
    """Datos base para crear una oportunidad."""
    return {
        "lead_id": created_lead["id"],
        "name": "Implementación GRC St4rtup",
        "stage": "discovery",
        "value": 25000.0,
        "probability": 30,
        "currency": "EUR",
        "description": "Oportunidad para plataforma GRC completa",
    }


class TestListOpportunities:
    """Tests para GET /api/v1/opportunities/"""

    async def test_list_empty(self, client):
        response = await client.get("/api/v1/opportunities/")
        assert response.status_code == 200
        assert response.json()["items"] == []

    async def test_list_with_data(self, client, opportunity_data):
        await client.post("/api/v1/opportunities/", json=opportunity_data)

        response = await client.get("/api/v1/opportunities/")
        data = response.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["name"] == "Implementación GRC St4rtup"

    async def test_list_filter_stage(self, client, opportunity_data):
        await client.post("/api/v1/opportunities/", json=opportunity_data)
        await client.post("/api/v1/opportunities/", json={
            **opportunity_data, "name": "Otro Deal", "stage": "proposal"
        })

        response = await client.get("/api/v1/opportunities/?stage=discovery")
        data = response.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["stage"] == "discovery"

    async def test_list_filter_lead(self, client, opportunity_data):
        lead_id = opportunity_data["lead_id"]
        await client.post("/api/v1/opportunities/", json=opportunity_data)

        response = await client.get(f"/api/v1/opportunities/?lead_id={lead_id}")
        data = response.json()
        assert len(data["items"]) == 1


class TestCreateOpportunity:
    """Tests para POST /api/v1/opportunities/"""

    async def test_create(self, client, opportunity_data):
        response = await client.post("/api/v1/opportunities/", json=opportunity_data)
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Implementación GRC St4rtup"
        assert data["stage"] == "discovery"
        assert data["value"] == 25000.0
        assert data["probability"] == 30

    async def test_create_minimal(self, client, created_lead):
        response = await client.post("/api/v1/opportunities/", json={
            "lead_id": created_lead["id"],
            "name": "Deal Mínimo",
            "stage": "discovery",
        })
        assert response.status_code == 201


class TestUpdateOpportunity:
    """Tests para PUT /api/v1/opportunities/{id}"""

    async def test_update_stage(self, client, opportunity_data):
        create_resp = await client.post("/api/v1/opportunities/", json=opportunity_data)
        opp_id = create_resp.json()["id"]

        response = await client.put(f"/api/v1/opportunities/{opp_id}", json={
            "stage": "proposal",
            "probability": 60,
        })
        assert response.status_code == 200
        data = response.json()
        assert data["stage"] == "proposal"
        assert data["probability"] == 60

    async def test_update_value(self, client, opportunity_data):
        create_resp = await client.post("/api/v1/opportunities/", json=opportunity_data)
        opp_id = create_resp.json()["id"]

        response = await client.put(f"/api/v1/opportunities/{opp_id}", json={
            "value": 50000.0,
        })
        assert response.status_code == 200
        assert response.json()["value"] == 50000.0


class TestDeleteOpportunity:
    """Tests para DELETE /api/v1/opportunities/{id}"""

    async def test_delete(self, client, opportunity_data):
        create_resp = await client.post("/api/v1/opportunities/", json=opportunity_data)
        opp_id = create_resp.json()["id"]

        response = await client.delete(f"/api/v1/opportunities/{opp_id}")
        assert response.status_code == 204

    async def test_delete_not_found(self, client):
        response = await client.delete("/api/v1/opportunities/00000000-0000-0000-0000-000000000000")
        assert response.status_code == 404


class TestDashboardStats:
    """Tests para GET /api/v1/dashboard/stats"""

    async def test_dashboard_empty(self, client):
        response = await client.get("/api/v1/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        assert data["total_leads"] == 0
        assert data["pipeline_value"] == 0
        assert data["actions_overdue"] == 0

    async def test_dashboard_with_leads(self, client, lead_data):
        await client.post("/api/v1/leads/", json=lead_data)
        await client.post("/api/v1/leads/", json={**lead_data, "company_name": "Otra"})

        response = await client.get("/api/v1/dashboard/stats")
        data = response.json()
        assert data["total_leads"] == 2

    async def test_dashboard_with_pipeline(self, client, lead_data):
        lead_resp = await client.post("/api/v1/leads/", json=lead_data)
        lead_id = lead_resp.json()["id"]

        await client.post("/api/v1/opportunities/", json={
            "lead_id": lead_id,
            "name": "Deal Test",
            "stage": "proposal",
            "value": 10000.0,
            "probability": 50,
        })

        response = await client.get("/api/v1/dashboard/stats")
        data = response.json()
        assert data["pipeline_value"] == 10000.0
        assert data["weighted_pipeline"] == 5000.0
