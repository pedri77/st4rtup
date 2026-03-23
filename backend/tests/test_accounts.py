"""Tests para el endpoint de planes de cuenta."""
import pytest


class TestGetAccountPlan:
    """Tests para GET /api/v1/account-plans/lead/{lead_id}"""

    async def test_get_plan_no_plan(self, client, created_lead):
        response = await client.get(f"/api/v1/account-plans/lead/{created_lead['id']}")
        assert response.status_code in (200, 404)

    async def test_get_plan_success(self, client, created_lead):
        plan_data = {
            "lead_id": created_lead["id"],
            "objective": "Implementar GRC completo",
            "value_proposition": "Cumplimiento ENS y NIS2",
            "target_products": ["GRC Platform", "ENS Module"],
            "estimated_deal_value": 25000.0,
        }
        await client.post("/api/v1/account-plans/", json=plan_data)

        response = await client.get(f"/api/v1/account-plans/lead/{created_lead['id']}")
        assert response.status_code == 200
        data = response.json()
        assert data["objective"] == "Implementar GRC completo"
        assert data["estimated_deal_value"] == 25000.0

    async def test_get_plan_invalid_lead(self, client):
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.get(f"/api/v1/account-plans/lead/{fake_id}")
        assert response.status_code in (200, 404)


class TestCreateAccountPlan:
    """Tests para POST /api/v1/account-plans/"""

    async def test_create_plan_success(self, client, created_lead):
        plan_data = {
            "lead_id": created_lead["id"],
            "objective": "Implementar GRC completo",
            "value_proposition": "Cumplimiento ENS y NIS2",
            "target_products": ["GRC Platform", "ENS Module"],
            "estimated_deal_value": 25000.0,
        }
        response = await client.post("/api/v1/account-plans/", json=plan_data)
        assert response.status_code == 201
        data = response.json()
        assert data["objective"] == "Implementar GRC completo"
        assert data["value_proposition"] == "Cumplimiento ENS y NIS2"
        assert data["estimated_deal_value"] == 25000.0
        assert "id" in data

    async def test_create_plan_duplicate_lead(self, client, created_lead):
        plan_data = {
            "lead_id": created_lead["id"],
            "objective": "Implementar GRC completo",
            "value_proposition": "Cumplimiento ENS y NIS2",
            "target_products": ["GRC Platform", "ENS Module"],
            "estimated_deal_value": 25000.0,
        }
        resp1 = await client.post("/api/v1/account-plans/", json=plan_data)
        assert resp1.status_code == 201

        resp2 = await client.post("/api/v1/account-plans/", json=plan_data)
        assert resp2.status_code == 409

    async def test_create_plan_minimal(self, client, created_lead):
        """All fields except lead_id are optional — minimal create should work."""
        response = await client.post("/api/v1/account-plans/", json={
            "lead_id": created_lead["id"],
        })
        assert response.status_code == 201


class TestUpdateAccountPlan:
    """Tests para PUT /api/v1/account-plans/{plan_id}"""

    async def test_update_plan_success(self, client, created_lead):
        plan_data = {
            "lead_id": created_lead["id"],
            "objective": "Implementar GRC completo",
            "value_proposition": "Cumplimiento ENS y NIS2",
            "target_products": ["GRC Platform", "ENS Module"],
            "estimated_deal_value": 25000.0,
        }
        create_resp = await client.post("/api/v1/account-plans/", json=plan_data)
        plan_id = create_resp.json()["id"]

        response = await client.put(f"/api/v1/account-plans/{plan_id}", json={
            "lead_id": created_lead["id"],
            "objective": "Objetivo actualizado",
            "estimated_deal_value": 35000.0,
        })
        assert response.status_code == 200
        data = response.json()
        assert data["objective"] == "Objetivo actualizado"
        assert data["estimated_deal_value"] == 35000.0

    async def test_update_plan_not_found(self, client, created_lead):
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.put(f"/api/v1/account-plans/{fake_id}", json={
            "lead_id": created_lead["id"],
            "objective": "No existe",
        })
        assert response.status_code == 404
