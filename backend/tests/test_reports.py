"""Tests para el endpoint de reportes."""
import pytest


class TestSalesPerformance:
    """Tests para GET /api/v1/reports/sales-performance"""

    async def test_sales_performance_default(self, client):
        response = await client.get("/api/v1/reports/sales-performance")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)

    async def test_sales_performance_with_period(self, client):
        response = await client.get("/api/v1/reports/sales-performance?period=last_7")
        assert response.status_code == 200
        assert isinstance(response.json(), dict)


class TestConversionFunnel:
    """Tests para GET /api/v1/reports/conversion-funnel"""

    async def test_conversion_funnel_default(self, client):
        response = await client.get("/api/v1/reports/conversion-funnel")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)

    async def test_conversion_funnel_with_period(self, client):
        response = await client.get("/api/v1/reports/conversion-funnel?period=last_90")
        assert response.status_code == 200
        assert isinstance(response.json(), dict)


class TestActivityReport:
    """Tests para GET /api/v1/reports/activity"""

    async def test_activity_default(self, client):
        response = await client.get("/api/v1/reports/activity")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)

    async def test_activity_with_period(self, client):
        response = await client.get("/api/v1/reports/activity?period=this_month")
        assert response.status_code == 200
        assert isinstance(response.json(), dict)


class TestTopAccounts:
    """Tests para GET /api/v1/reports/top-accounts"""

    async def test_top_accounts_default(self, client):
        response = await client.get("/api/v1/reports/top-accounts")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)

    async def test_top_accounts_with_limit(self, client):
        response = await client.get("/api/v1/reports/top-accounts?limit=5")
        assert response.status_code == 200
        assert isinstance(response.json(), dict)


class TestLeadsBySource:
    """Tests para GET /api/v1/reports/leads-by-source"""

    async def test_leads_by_source_default(self, client):
        response = await client.get("/api/v1/reports/leads-by-source")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)

    async def test_leads_by_source_with_data(self, client, created_lead):
        """Leads by source with at least one lead in DB."""
        response = await client.get("/api/v1/reports/leads-by-source")
        assert response.status_code == 200
        assert isinstance(response.json(), dict)
