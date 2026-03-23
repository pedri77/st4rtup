"""Tests para el endpoint de ofertas/propuestas."""
import pytest


class TestListOffers:
    """Tests para GET /api/v1/offers"""

    async def test_list_offers_empty(self, client):
        response = await client.get("/api/v1/offers")
        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0

    async def test_list_offers_with_data(self, client, created_lead, offer_data):
        offer_data["lead_id"] = created_lead["id"]
        await client.post("/api/v1/offers", json=offer_data)

        response = await client.get("/api/v1/offers")
        data = response.json()
        assert data["total"] >= 1
        assert len(data["items"]) >= 1

    async def test_list_offers_pagination(self, client, created_lead, offer_data):
        offer_data["lead_id"] = created_lead["id"]
        # Crear 3 ofertas
        for i in range(3):
            offer_data["title"] = f"Propuesta {i+1}"
            await client.post("/api/v1/offers", json=offer_data)

        response = await client.get("/api/v1/offers?page=1&page_size=2")
        data = response.json()
        assert len(data["items"]) == 2
        assert data["total"] == 3
        assert data["pages"] == 2

    async def test_list_offers_search(self, client, created_lead, offer_data):
        offer_data["lead_id"] = created_lead["id"]
        offer_data["title"] = "Propuesta Especial NIS2"
        await client.post("/api/v1/offers", json=offer_data)

        response = await client.get("/api/v1/offers?search=NIS2")
        data = response.json()
        assert data["total"] >= 1

    async def test_list_offers_filter_status(self, client, created_lead, offer_data):
        offer_data["lead_id"] = created_lead["id"]
        await client.post("/api/v1/offers", json=offer_data)

        response = await client.get("/api/v1/offers?status=draft")
        data = response.json()
        assert data["total"] >= 1
        for item in data["items"]:
            assert item["status"] == "draft"


class TestCreateOffer:
    """Tests para POST /api/v1/offers"""

    async def test_create_offer_success(self, client, created_lead, offer_data):
        offer_data["lead_id"] = created_lead["id"]
        response = await client.post("/api/v1/offers", json=offer_data)
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "Propuesta GRC Enterprise"
        assert data["total"] == 24200
        assert data["currency"] == "EUR"
        assert data["status"] == "draft"
        assert data["reference"].startswith("OF-")
        assert data["lead_name"] == "Empresa Test S.L."
        assert "id" in data

    async def test_create_offer_invalid_lead(self, client, offer_data):
        offer_data["lead_id"] = "00000000-0000-0000-0000-000000000000"
        response = await client.post("/api/v1/offers", json=offer_data)
        assert response.status_code == 404

    async def test_create_offer_missing_title(self, client, created_lead):
        response = await client.post("/api/v1/offers", json={
            "lead_id": created_lead["id"],
        })
        assert response.status_code == 422

    async def test_create_offer_sequential_reference(self, client, created_lead, offer_data):
        offer_data["lead_id"] = created_lead["id"]
        resp1 = await client.post("/api/v1/offers", json=offer_data)
        resp2 = await client.post("/api/v1/offers", json=offer_data)
        ref1 = resp1.json()["reference"]
        ref2 = resp2.json()["reference"]
        # References should be sequential
        assert ref1 != ref2
        assert ref1.startswith("OF-")
        assert ref2.startswith("OF-")


class TestGetOffer:
    """Tests para GET /api/v1/offers/{id}"""

    async def test_get_offer_success(self, client, created_lead, offer_data):
        offer_data["lead_id"] = created_lead["id"]
        create_resp = await client.post("/api/v1/offers", json=offer_data)
        offer_id = create_resp.json()["id"]

        response = await client.get(f"/api/v1/offers/{offer_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == offer_id
        assert data["title"] == "Propuesta GRC Enterprise"

    async def test_get_offer_not_found(self, client):
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.get(f"/api/v1/offers/{fake_id}")
        assert response.status_code == 404


class TestUpdateOffer:
    """Tests para PUT /api/v1/offers/{id}"""

    async def test_update_offer_success(self, client, created_lead, offer_data):
        offer_data["lead_id"] = created_lead["id"]
        create_resp = await client.post("/api/v1/offers", json=offer_data)
        offer_id = create_resp.json()["id"]

        response = await client.put(f"/api/v1/offers/{offer_id}", json={
            "title": "Propuesta Actualizada",
            "total": 30000,
        })
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Propuesta Actualizada"
        assert data["total"] == 30000

    async def test_update_offer_status_to_sent(self, client, created_lead, offer_data):
        offer_data["lead_id"] = created_lead["id"]
        create_resp = await client.post("/api/v1/offers", json=offer_data)
        offer_id = create_resp.json()["id"]

        response = await client.put(f"/api/v1/offers/{offer_id}", json={
            "status": "sent",
        })
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "sent"
        assert data["sent_at"] is not None

    async def test_update_offer_status_to_accepted(self, client, created_lead, offer_data):
        offer_data["lead_id"] = created_lead["id"]
        create_resp = await client.post("/api/v1/offers", json=offer_data)
        offer_id = create_resp.json()["id"]

        # First send it
        await client.put(f"/api/v1/offers/{offer_id}", json={"status": "sent"})

        # Then accept it
        response = await client.put(f"/api/v1/offers/{offer_id}", json={
            "status": "accepted",
        })
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "accepted"
        assert data["accepted_at"] is not None

    async def test_update_offer_not_found(self, client):
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.put(f"/api/v1/offers/{fake_id}", json={
            "title": "No existe",
        })
        assert response.status_code == 404


class TestDeleteOffer:
    """Tests para DELETE /api/v1/offers/{id}"""

    async def test_delete_offer_success(self, client, created_lead, offer_data):
        offer_data["lead_id"] = created_lead["id"]
        create_resp = await client.post("/api/v1/offers", json=offer_data)
        offer_id = create_resp.json()["id"]

        response = await client.delete(f"/api/v1/offers/{offer_id}")
        assert response.status_code == 204

        # Verify deleted
        get_resp = await client.get(f"/api/v1/offers/{offer_id}")
        assert get_resp.status_code == 404

    async def test_delete_offer_not_found(self, client):
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.delete(f"/api/v1/offers/{fake_id}")
        assert response.status_code == 404
