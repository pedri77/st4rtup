"""Tests para el endpoint de surveys."""
import pytest


@pytest.fixture
def survey_data(created_lead):
    """Datos base para crear una encuesta."""
    return {
        "lead_id": created_lead["id"],
        "title": "Encuesta NPS Q1 2026",
        "survey_type": "nps",
    }


class TestListSurveys:
    """Tests para GET /api/v1/surveys/"""

    async def test_list_surveys_empty(self, client):
        response = await client.get("/api/v1/surveys/")
        assert response.status_code == 200
        assert response.json()["items"] == []

    async def test_list_surveys_with_data(self, client, survey_data):
        await client.post("/api/v1/surveys/", json=survey_data)
        await client.post("/api/v1/surveys/", json={**survey_data, "title": "CSAT Q1", "survey_type": "csat"})

        response = await client.get("/api/v1/surveys/")
        data = response.json()
        assert len(data["items"]) == 2

    async def test_list_surveys_filter_type(self, client, survey_data):
        await client.post("/api/v1/surveys/", json=survey_data)
        await client.post("/api/v1/surveys/", json={**survey_data, "title": "CSAT", "survey_type": "csat"})

        response = await client.get("/api/v1/surveys/?survey_type=nps")
        data = response.json()
        assert len(data["items"]) == 1
        assert data["items"][0]["survey_type"] == "nps"


class TestCreateSurvey:
    """Tests para POST /api/v1/surveys/"""

    async def test_create_survey(self, client, survey_data):
        response = await client.post("/api/v1/surveys/", json=survey_data)
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "Encuesta NPS Q1 2026"
        assert data["survey_type"] == "nps"
        assert data["status"] == "draft"
        assert data["response_token"] is not None

    async def test_create_survey_csat(self, client, survey_data):
        payload = {**survey_data, "survey_type": "csat", "title": "CSAT Survey"}
        response = await client.post("/api/v1/surveys/", json=payload)
        assert response.status_code == 201
        assert response.json()["survey_type"] == "csat"

    async def test_create_survey_without_lead(self, client):
        response = await client.post("/api/v1/surveys/", json={
            "title": "Test Survey",
            "survey_type": "nps",
        })
        assert response.status_code in [201, 422]


class TestGetSurvey:
    """Tests para GET /api/v1/surveys/{id}"""

    async def test_get_survey(self, client, survey_data):
        create_resp = await client.post("/api/v1/surveys/", json=survey_data)
        survey_id = create_resp.json()["id"]

        response = await client.get(f"/api/v1/surveys/{survey_id}")
        assert response.status_code == 200
        assert response.json()["title"] == "Encuesta NPS Q1 2026"

    async def test_get_survey_not_found(self, client):
        response = await client.get("/api/v1/surveys/00000000-0000-0000-0000-000000000000")
        assert response.status_code == 404


class TestUpdateSurvey:
    """Tests para PUT /api/v1/surveys/{id}"""

    async def test_update_survey(self, client, survey_data):
        create_resp = await client.post("/api/v1/surveys/", json=survey_data)
        survey_id = create_resp.json()["id"]

        response = await client.put(f"/api/v1/surveys/{survey_id}", json={
            "title": "Encuesta NPS Actualizada",
        })
        assert response.status_code == 200
        assert response.json()["title"] == "Encuesta NPS Actualizada"


class TestDeleteSurvey:
    """Tests para DELETE /api/v1/surveys/{id}"""

    async def test_delete_survey(self, client, survey_data):
        create_resp = await client.post("/api/v1/surveys/", json=survey_data)
        survey_id = create_resp.json()["id"]

        response = await client.delete(f"/api/v1/surveys/{survey_id}")
        assert response.status_code == 204

        get_resp = await client.get(f"/api/v1/surveys/{survey_id}")
        assert get_resp.status_code == 404


class TestRespondSurvey:
    """Tests para POST /api/v1/surveys/{id}/respond"""

    async def test_respond_nps(self, client, survey_data):
        create_resp = await client.post("/api/v1/surveys/", json=survey_data)
        survey_id = create_resp.json()["id"]

        response = await client.post(f"/api/v1/surveys/{survey_id}/respond", json={
            "nps_score": 9,
            "responses": [{"question": "nps", "answer": 9, "score": 9}],
            "notes": "Great service",
        })
        assert response.status_code == 200
        data = response.json()
        assert data["nps_score"] == 9
        assert data["status"] == "completed"

    async def test_respond_csat(self, client, survey_data):
        payload = {**survey_data, "survey_type": "csat", "title": "CSAT Test"}
        create_resp = await client.post("/api/v1/surveys/", json=payload)
        survey_id = create_resp.json()["id"]

        response = await client.post(f"/api/v1/surveys/{survey_id}/respond", json={
            "overall_score": 4,
            "responses": [{"question": "csat", "answer": 4, "score": 4}],
        })
        assert response.status_code == 200
        assert response.json()["overall_score"] == 4


class TestSurveyAnalytics:
    """Tests para GET /api/v1/surveys/analytics"""

    async def test_analytics_empty(self, client):
        response = await client.get("/api/v1/surveys/analytics")
        assert response.status_code == 200
        data = response.json()
        assert "trends" in data
        assert "nps_distribution" in data
        assert "csat_distribution" in data

    async def test_analytics_with_data(self, client, survey_data):
        # Create and respond to a survey
        create_resp = await client.post("/api/v1/surveys/", json=survey_data)
        survey_id = create_resp.json()["id"]
        await client.post(f"/api/v1/surveys/{survey_id}/respond", json={
            "nps_score": 9,
            "responses": [{"question": "nps", "answer": 9, "score": 9}],
        })

        response = await client.get("/api/v1/surveys/analytics")
        assert response.status_code == 200
        data = response.json()
        assert data["nps_distribution"]["promoters"] >= 1
