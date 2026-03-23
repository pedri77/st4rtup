"""Tests para el endpoint de visitas."""
import pytest


class TestListVisits:
    """Tests para GET /api/v1/visits/"""

    async def test_list_visits_empty(self, client):
        response = await client.get("/api/v1/visits/")
        assert response.status_code == 200
        assert response.json()["items"] == []

    async def test_list_visits_with_data(self, client, created_lead, visit_data):
        visit_data["lead_id"] = created_lead["id"]
        await client.post("/api/v1/visits/", json=visit_data)

        response = await client.get("/api/v1/visits/")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["lead_name"] == created_lead["company_name"]

    async def test_list_visits_filter_by_lead(self, client, created_lead, visit_data):
        visit_data["lead_id"] = created_lead["id"]
        await client.post("/api/v1/visits/", json=visit_data)

        response = await client.get(f"/api/v1/visits/?lead_id={created_lead['id']}")
        assert response.status_code == 200
        assert len(response.json()["items"]) == 1


class TestCreateVisit:
    """Tests para POST /api/v1/visits/"""

    async def test_create_visit_success(self, client, created_lead, visit_data):
        visit_data["lead_id"] = created_lead["id"]
        response = await client.post("/api/v1/visits/", json=visit_data)
        assert response.status_code == 201
        data = response.json()
        assert data["visit_type"] == "presencial"
        assert data["result"] == "positive"
        assert data["location"] == "Madrid - Oficina cliente"
        assert "id" in data

    async def test_create_visit_missing_lead_id(self, client, visit_data):
        response = await client.post("/api/v1/visits/", json=visit_data)
        assert response.status_code == 422

    async def test_create_visit_invalid_type(self, client, created_lead, visit_data):
        visit_data["lead_id"] = created_lead["id"]
        visit_data["visit_type"] = "invalid_type"
        response = await client.post("/api/v1/visits/", json=visit_data)
        assert response.status_code == 422


class TestGetVisit:
    """Tests para GET /api/v1/visits/{id}"""

    async def test_get_visit_success(self, client, created_lead, visit_data):
        visit_data["lead_id"] = created_lead["id"]
        create_resp = await client.post("/api/v1/visits/", json=visit_data)
        visit_id = create_resp.json()["id"]

        response = await client.get(f"/api/v1/visits/{visit_id}")
        assert response.status_code == 200
        assert response.json()["id"] == visit_id

    async def test_get_visit_not_found(self, client):
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.get(f"/api/v1/visits/{fake_id}")
        assert response.status_code == 404


class TestDeleteVisit:
    """Tests para DELETE /api/v1/visits/{id}"""

    async def test_delete_visit_success(self, client, created_lead, visit_data):
        visit_data["lead_id"] = created_lead["id"]
        create_resp = await client.post("/api/v1/visits/", json=visit_data)
        visit_id = create_resp.json()["id"]

        response = await client.delete(f"/api/v1/visits/{visit_id}")
        assert response.status_code == 204

    async def test_delete_visit_not_found(self, client):
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.delete(f"/api/v1/visits/{fake_id}")
        assert response.status_code == 404
