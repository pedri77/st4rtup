"""Tests para el endpoint de leads."""
import pytest


class TestListLeads:
    """Tests para GET /api/v1/leads/"""

    async def test_list_leads_empty(self, client):
        response = await client.get("/api/v1/leads/")
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0
        assert data["page"] == 1

    async def test_list_leads_with_data(self, client, lead_data):
        # Create 3 leads
        for i in range(3):
            payload = {**lead_data, "company_name": f"Empresa {i}"}
            await client.post("/api/v1/leads/", json=payload)

        response = await client.get("/api/v1/leads/")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 3
        assert len(data["items"]) == 3

    async def test_list_leads_pagination(self, client, lead_data):
        for i in range(5):
            payload = {**lead_data, "company_name": f"Empresa {i}"}
            await client.post("/api/v1/leads/", json=payload)

        response = await client.get("/api/v1/leads/?page=1&page_size=2")
        data = response.json()
        assert len(data["items"]) == 2
        assert data["total"] == 5
        assert data["pages"] == 3

    async def test_list_leads_search(self, client, lead_data):
        await client.post("/api/v1/leads/", json={**lead_data, "company_name": "St4rtup S.L."})
        await client.post("/api/v1/leads/", json={**lead_data, "company_name": "Otra Empresa"})

        response = await client.get("/api/v1/leads/?search=St4rtup")
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["company_name"] == "St4rtup S.L."

    async def test_list_leads_filter_status(self, client, lead_data):
        await client.post("/api/v1/leads/", json={**lead_data, "status": "new"})
        await client.post("/api/v1/leads/", json={**lead_data, "company_name": "Otra", "status": "qualified"})

        response = await client.get("/api/v1/leads/?status=qualified")
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["status"] == "qualified"


class TestCreateLead:
    """Tests para POST /api/v1/leads/"""

    async def test_create_lead_success(self, client, lead_data):
        response = await client.post("/api/v1/leads/", json=lead_data)
        assert response.status_code == 201
        data = response.json()
        assert data["company_name"] == lead_data["company_name"]
        assert data["contact_name"] == lead_data["contact_name"]
        assert data["status"] == "new"
        assert "id" in data

    async def test_create_lead_minimal(self, client):
        response = await client.post("/api/v1/leads/", json={
            "company_name": "Empresa Mínima",
            "source": "website",
        })
        assert response.status_code == 201
        assert response.json()["company_name"] == "Empresa Mínima"

    async def test_create_lead_missing_company_name(self, client):
        response = await client.post("/api/v1/leads/", json={
            "source": "website",
        })
        assert response.status_code == 422

    async def test_create_lead_invalid_status(self, client):
        response = await client.post("/api/v1/leads/", json={
            "company_name": "Test",
            "source": "website",
            "status": "invalid_status",
        })
        assert response.status_code == 422


class TestGetLead:
    """Tests para GET /api/v1/leads/{id}"""

    async def test_get_lead_success(self, client, lead_data):
        # Create inline to avoid fixture session issues
        create_resp = await client.post("/api/v1/leads/", json=lead_data)
        assert create_resp.status_code == 201
        lead_id = create_resp.json()["id"]

        response = await client.get(f"/api/v1/leads/{lead_id}")
        assert response.status_code == 200
        assert response.json()["company_name"] == lead_data["company_name"]

    async def test_get_lead_not_found(self, client):
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.get(f"/api/v1/leads/{fake_id}")
        assert response.status_code == 404

    async def test_get_lead_invalid_id(self, client):
        response = await client.get("/api/v1/leads/not-a-uuid")
        assert response.status_code == 422


class TestUpdateLead:
    """Tests para PUT /api/v1/leads/{id}"""

    async def test_update_lead_success(self, client, created_lead):
        lead_id = created_lead["id"]
        response = await client.put(f"/api/v1/leads/{lead_id}", json={
            "company_name": "Empresa Actualizada S.L.",
        })
        assert response.status_code == 200
        assert response.json()["company_name"] == "Empresa Actualizada S.L."

    async def test_update_lead_status(self, client, created_lead):
        lead_id = created_lead["id"]
        response = await client.put(f"/api/v1/leads/{lead_id}", json={
            "status": "qualified",
        })
        assert response.status_code == 200
        assert response.json()["status"] == "qualified"

    async def test_update_lead_not_found(self, client):
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.put(f"/api/v1/leads/{fake_id}", json={
            "company_name": "No Existe",
        })
        assert response.status_code == 404


class TestDeleteLead:
    """Tests para DELETE /api/v1/leads/{id}"""

    async def test_delete_lead_success(self, client, created_lead):
        lead_id = created_lead["id"]
        response = await client.delete(f"/api/v1/leads/{lead_id}")
        assert response.status_code == 204

        # Verify it's gone
        response = await client.get(f"/api/v1/leads/{lead_id}")
        assert response.status_code == 404

    async def test_delete_lead_not_found(self, client):
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.delete(f"/api/v1/leads/{fake_id}")
        assert response.status_code == 404
