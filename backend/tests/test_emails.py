"""Tests para el endpoint de emails."""
import pytest


class TestListEmails:
    """Tests para GET /api/v1/emails/"""

    async def test_list_emails_empty(self, client):
        response = await client.get("/api/v1/emails/")
        assert response.status_code == 200
        assert response.json()["items"] == []

    async def test_list_emails_with_data(self, client, created_lead, email_data):
        email_data["lead_id"] = created_lead["id"]
        await client.post("/api/v1/emails/", json=email_data)

        response = await client.get("/api/v1/emails/")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["lead_name"] == created_lead["company_name"]


class TestCreateEmail:
    """Tests para POST /api/v1/emails/"""

    async def test_create_email_draft(self, client, created_lead, email_data):
        email_data["lead_id"] = created_lead["id"]
        response = await client.post("/api/v1/emails/", json=email_data)
        assert response.status_code == 201
        data = response.json()
        assert data["subject"] == "Propuesta St4rtup GRC"
        assert data["status"] == "draft"
        assert data["to_email"] == "cliente@empresa.com"
        assert "id" in data

    async def test_create_email_missing_subject(self, client, created_lead):
        response = await client.post("/api/v1/emails/", json={
            "lead_id": created_lead["id"],
            "to_email": "test@test.com",
        })
        assert response.status_code == 422

    async def test_create_email_missing_lead_id(self, client, email_data):
        response = await client.post("/api/v1/emails/", json=email_data)
        assert response.status_code == 422


class TestGetEmail:
    """Tests para GET /api/v1/emails/{id}"""

    async def test_get_email_success(self, client, created_lead, email_data):
        email_data["lead_id"] = created_lead["id"]
        create_resp = await client.post("/api/v1/emails/", json=email_data)
        email_id = create_resp.json()["id"]

        response = await client.get(f"/api/v1/emails/{email_id}")
        assert response.status_code == 200
        assert response.json()["subject"] == email_data["subject"]

    async def test_get_email_not_found(self, client):
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.get(f"/api/v1/emails/{fake_id}")
        assert response.status_code == 404


