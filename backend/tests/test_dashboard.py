"""Tests para el endpoint del dashboard."""
import pytest


class TestDashboardStats:
    """Tests para GET /api/v1/dashboard/stats"""

    async def test_dashboard_stats_empty(self, client):
        response = await client.get("/api/v1/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        assert data["total_leads"] == 0
        assert data["pipeline_value"] == 0
        assert data["actions_overdue"] == 0
        assert data["emails_sent_this_month"] == 0
        assert data["visits_this_month"] == 0
        assert isinstance(data["activity_last_7_days"], list)
        assert len(data["activity_last_7_days"]) == 7
        assert isinstance(data["conversion_funnel"], list)

    async def test_dashboard_stats_with_leads(self, client, lead_data):
        await client.post("/api/v1/leads/", json=lead_data)
        await client.post("/api/v1/leads/", json={**lead_data, "company_name": "Empresa 2"})

        response = await client.get("/api/v1/dashboard/stats")
        data = response.json()
        assert data["total_leads"] == 2

    async def test_dashboard_stats_structure(self, client):
        response = await client.get("/api/v1/dashboard/stats")
        data = response.json()

        expected_keys = [
            "total_leads", "leads_by_status", "pipeline_value",
            "weighted_pipeline", "actions_overdue", "actions_due_today",
            "emails_sent_this_month", "visits_this_month", "conversion_rate",
            "pipeline_by_stage", "activity_last_7_days", "upcoming_visits",
            "stale_opportunities", "leads_trend", "pipeline_trend",
            "conversion_trend", "conversion_funnel", "top_leads_by_score",
            "leads_by_sector", "recent_activity",
        ]
        for key in expected_keys:
            assert key in data, f"Missing key: {key}"

    async def test_dashboard_activity_7_days_format(self, client):
        response = await client.get("/api/v1/dashboard/stats")
        data = response.json()

        for day in data["activity_last_7_days"]:
            assert "date" in day
            assert "emails" in day
            assert "visits" in day
            assert "actions" in day
