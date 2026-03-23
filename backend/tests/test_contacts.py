"""Tests para el endpoint de contactos/stakeholders."""
import pytest


class TestListContacts:
    """Tests para GET /api/v1/contacts/"""

    async def test_list_contacts_empty(self, client):
        response = await client.get("/api/v1/contacts")
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0

    async def test_list_contacts_with_data(self, client, created_lead, contact_data):
        contact_data["lead_id"] = created_lead["id"]
        await client.post("/api/v1/contacts", json=contact_data)

        response = await client.get("/api/v1/contacts")
        data = response.json()
        # May have 2 contacts: 1 from lead sync + 1 manually created
        assert data["total"] >= 1


class TestCreateContact:
    """Tests para POST /api/v1/contacts/"""

    async def test_create_contact_success(self, client, created_lead, contact_data):
        contact_data["lead_id"] = created_lead["id"]
        response = await client.post("/api/v1/contacts", json=contact_data)
        assert response.status_code == 201
        data = response.json()
        assert data["full_name"] == "María García"
        assert data["role_type"] == "ciso"
        assert data["influence_level"] == "decision_maker"
        assert data["lead_name"] == "Empresa Test S.L."
        assert "id" in data

    async def test_create_contact_missing_name(self, client, created_lead):
        response = await client.post("/api/v1/contacts", json={
            "lead_id": created_lead["id"],
        })
        assert response.status_code == 422

    async def test_create_contact_invalid_lead(self, client, contact_data):
        contact_data["lead_id"] = "00000000-0000-0000-0000-000000000000"
        response = await client.post("/api/v1/contacts", json=contact_data)
        assert response.status_code == 404


class TestGetContactsByLead:
    """Tests para GET /api/v1/contacts/by-lead/{lead_id}"""

    async def test_get_contacts_by_lead(self, client, created_lead, contact_data):
        contact_data["lead_id"] = created_lead["id"]
        await client.post("/api/v1/contacts", json=contact_data)

        response = await client.get(f"/api/v1/contacts/by-lead/{created_lead['id']}")
        assert response.status_code == 200
        contacts = response.json()
        assert len(contacts) >= 1

    async def test_get_contacts_by_lead_not_found(self, client):
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.get(f"/api/v1/contacts/by-lead/{fake_id}")
        assert response.status_code == 404


class TestContactStats:
    """Tests para GET /api/v1/contacts/stats"""

    async def test_stats_empty(self, client):
        response = await client.get("/api/v1/contacts/stats")
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "by_role" in data
        assert "by_influence" in data

    async def test_stats_with_data(self, client, created_lead, contact_data):
        contact_data["lead_id"] = created_lead["id"]
        await client.post("/api/v1/contacts", json=contact_data)

        response = await client.get("/api/v1/contacts/stats")
        data = response.json()
        assert data["total"] >= 1


class TestDeleteContact:
    """Tests para DELETE /api/v1/contacts/{id}"""

    async def test_delete_contact_success(self, client, created_lead, contact_data):
        contact_data["lead_id"] = created_lead["id"]
        create_resp = await client.post("/api/v1/contacts", json=contact_data)
        contact_id = create_resp.json()["id"]

        response = await client.delete(f"/api/v1/contacts/{contact_id}")
        assert response.status_code == 204

    async def test_delete_contact_not_found(self, client):
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.delete(f"/api/v1/contacts/{fake_id}")
        assert response.status_code == 404
