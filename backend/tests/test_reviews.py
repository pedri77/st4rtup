"""Tests para el endpoint de revisiones mensuales."""
import pytest


class TestListReviews:
    """Tests para GET /api/v1/monthly-reviews/"""

    async def test_list_reviews_empty(self, client):
        response = await client.get("/api/v1/monthly-reviews/?page=1&page_size=20")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, (list, dict))

    async def test_list_reviews_with_data(self, client, created_lead):
        review_data = {
            "lead_id": created_lead["id"],
            "review_month": 3,
            "review_year": 2026,
            "project_status": "on_track",
            "health_score": 8,
            "summary": "Good progress this month",
            "emails_sent": 5,
            "meetings_held": 2,
        }
        await client.post("/api/v1/monthly-reviews/", json=review_data)

        response = await client.get("/api/v1/monthly-reviews/?page=1&page_size=20")
        assert response.status_code == 200
        data = response.json()
        if isinstance(data, list):
            assert len(data) >= 1
        else:
            assert data.get("total", len(data.get("items", []))) >= 1

    async def test_list_reviews_pagination(self, client, created_lead):
        for month in range(1, 4):
            review_data = {
                "lead_id": created_lead["id"],
                "review_month": month,
                "review_year": 2026,
                "project_status": "on_track",
                "health_score": 7,
                "summary": f"Review for month {month}",
                "emails_sent": month,
                "meetings_held": 1,
            }
            await client.post("/api/v1/monthly-reviews/", json=review_data)

        response = await client.get("/api/v1/monthly-reviews/?page=1&page_size=2")
        assert response.status_code == 200


class TestCreateReview:
    """Tests para POST /api/v1/monthly-reviews/"""

    async def test_create_review_success(self, client, created_lead):
        review_data = {
            "lead_id": created_lead["id"],
            "review_month": 3,
            "review_year": 2026,
            "project_status": "on_track",
            "health_score": 8,
            "summary": "Good progress this month",
            "emails_sent": 5,
            "meetings_held": 2,
        }
        response = await client.post("/api/v1/monthly-reviews/", json=review_data)
        assert response.status_code == 201
        data = response.json()
        assert data["review_month"] == 3
        assert data["review_year"] == 2026
        assert data["health_score"] == 8
        assert data["summary"] == "Good progress this month"
        assert "id" in data

    async def test_create_review_missing_fields(self, client, created_lead):
        response = await client.post("/api/v1/monthly-reviews/", json={
            "lead_id": created_lead["id"],
        })
        assert response.status_code == 422


class TestGetReview:
    """Tests para GET /api/v1/monthly-reviews/{id}"""

    async def test_get_review_success(self, client, created_lead):
        review_data = {
            "lead_id": created_lead["id"],
            "review_month": 3,
            "review_year": 2026,
            "project_status": "on_track",
            "health_score": 8,
            "summary": "Good progress this month",
            "emails_sent": 5,
            "meetings_held": 2,
        }
        create_resp = await client.post("/api/v1/monthly-reviews/", json=review_data)
        review_id = create_resp.json()["id"]

        response = await client.get(f"/api/v1/monthly-reviews/{review_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == review_id
        assert data["review_month"] == 3

    async def test_get_review_not_found(self, client):
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.get(f"/api/v1/monthly-reviews/{fake_id}")
        assert response.status_code == 404
