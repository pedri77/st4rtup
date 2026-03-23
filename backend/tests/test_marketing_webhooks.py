"""Tests para los webhooks de marketing n8n."""
import pytest
import uuid


@pytest.fixture
def campaign_metrics_payload():
    return {
        "event_id": f"test-camp-{uuid.uuid4().hex[:8]}",
        "source": "google_ads",
        "date": "2026-03-19",
        "metrics": [
            {
                "campaign_name": "GRC Platform - Search ES",
                "impressions": 4520,
                "clicks": 187,
                "cost": 234.50,
                "conversions": 12,
            }
        ],
    }


@pytest.fixture
def social_engagement_payload():
    return {
        "event_id": f"test-social-{uuid.uuid4().hex[:8]}",
        "source": "linkedin",
        "period": "2026-03-10/2026-03-16",
        "posts": [
            {
                "post_id": "urn:li:share:7123456789",
                "title": "NIS2 compliance guide",
                "impressions": 3400,
                "likes": 89,
                "comments": 12,
                "shares": 23,
                "clicks": 156,
            }
        ],
    }


@pytest.fixture
def content_published_payload():
    return {
        "event_id": f"test-content-{uuid.uuid4().hex[:8]}",
        "source": "wordpress",
        "content": {
            "title": "Guía completa NIS2",
            "url": "https://st4rtup.app/blog/guia-nis2",
            "type": "blog_post",
            "language": "es",
            "published_at": "2026-03-16T10:00:00Z",
        },
    }


@pytest.fixture
def external_alert_payload():
    return {
        "event_id": f"test-alert-{uuid.uuid4().hex[:8]}",
        "alert": {
            "type": "seo_drop",
            "severity": "warning",
            "title": "Caída de ranking",
            "description": "Keyword 'plataforma grc' bajó 10 posiciones.",
            "source": "dataforseo",
        },
    }


@pytest.fixture
def metrics_sync_payload():
    return {
        "event_id": f"test-metrics-{uuid.uuid4().hex[:8]}",
        "date": "2026-03-19",
        "source": "consolidated",
        "metrics": {
            "website": {"sessions": 1245, "users": 890},
            "ads": {"total_spend": 456.78},
        },
    }


class TestCampaignMetrics:
    @pytest.mark.asyncio
    async def test_receive_campaign_metrics(self, client, campaign_metrics_payload):
        r = await client.post("/api/v1/marketing/webhooks/campaign-metrics", json=campaign_metrics_payload)
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "ok"
        assert data["event_id"] == campaign_metrics_payload["event_id"]

    @pytest.mark.asyncio
    async def test_idempotency(self, client, campaign_metrics_payload):
        r1 = await client.post("/api/v1/marketing/webhooks/campaign-metrics", json=campaign_metrics_payload)
        assert r1.status_code == 200

        r2 = await client.post("/api/v1/marketing/webhooks/campaign-metrics", json=campaign_metrics_payload)
        assert r2.status_code == 200
        assert r2.json()["status"] == "already_processed"

    @pytest.mark.asyncio
    async def test_invalid_payload(self, client):
        r = await client.post("/api/v1/marketing/webhooks/campaign-metrics", json={"bad": "data"})
        assert r.status_code == 422


class TestSocialEngagement:
    @pytest.mark.asyncio
    async def test_receive_social_engagement(self, client, social_engagement_payload):
        r = await client.post("/api/v1/marketing/webhooks/social-engagement", json=social_engagement_payload)
        assert r.status_code == 200
        assert r.json()["status"] == "ok"


class TestContentPublished:
    @pytest.mark.asyncio
    async def test_receive_content_published(self, client, content_published_payload):
        r = await client.post("/api/v1/marketing/webhooks/content-published", json=content_published_payload)
        assert r.status_code == 200
        assert r.json()["status"] == "ok"
        assert r.json()["entities_affected"] == 2  # asset + calendar event


class TestLeadAttribution:
    @pytest.mark.asyncio
    async def test_lead_not_found(self, client):
        payload = {
            "event_id": f"test-attr-{uuid.uuid4().hex[:8]}",
            "lead_id": str(uuid.uuid4()),
            "touchpoints": [{"channel": "organic"}],
            "attribution_model": "last_touch",
        }
        r = await client.post("/api/v1/marketing/webhooks/lead-attribution", json=payload)
        assert r.status_code == 404

    @pytest.mark.asyncio
    async def test_with_valid_lead(self, client, created_lead):
        lead_id = created_lead["id"]
        payload = {
            "event_id": f"test-attr-{uuid.uuid4().hex[:8]}",
            "lead_id": lead_id,
            "touchpoints": [
                {"channel": "google_ads", "utm_source": "google", "utm_medium": "cpc"},
                {"channel": "organic", "landing_page": "https://st4rtup.app"},
            ],
            "attribution_model": "last_touch",
        }
        r = await client.post("/api/v1/marketing/webhooks/lead-attribution", json=payload)
        assert r.status_code == 200
        assert r.json()["entities_affected"] == 2


class TestExternalAlert:
    @pytest.mark.asyncio
    async def test_receive_alert(self, client, external_alert_payload):
        r = await client.post("/api/v1/marketing/webhooks/external-alert", json=external_alert_payload)
        assert r.status_code == 200
        assert r.json()["status"] == "ok"
        assert r.json()["entities_affected"] == 1


class TestMetricsSync:
    @pytest.mark.asyncio
    async def test_receive_metrics(self, client, metrics_sync_payload):
        r = await client.post("/api/v1/marketing/webhooks/metrics-sync", json=metrics_sync_payload)
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

    @pytest.mark.asyncio
    async def test_upsert_metrics(self, client, metrics_sync_payload):
        """Enviar dos veces con mismo date+source debe actualizar, no duplicar."""
        # First send
        r1 = await client.post("/api/v1/marketing/webhooks/metrics-sync", json=metrics_sync_payload)
        assert r1.status_code == 200

        # Second send with different event_id but same date+source
        payload2 = {**metrics_sync_payload, "event_id": f"test-metrics-{uuid.uuid4().hex[:8]}"}
        payload2["metrics"]["website"]["sessions"] = 9999
        r2 = await client.post("/api/v1/marketing/webhooks/metrics-sync", json=payload2)
        assert r2.status_code == 200

    @pytest.mark.asyncio
    async def test_invalid_date(self, client):
        payload = {
            "event_id": f"test-bad-date-{uuid.uuid4().hex[:8]}",
            "date": "not-a-date",
            "source": "test",
            "metrics": {},
        }
        r = await client.post("/api/v1/marketing/webhooks/metrics-sync", json=payload)
        assert r.status_code == 400


class TestMonitoringEndpoints:
    @pytest.mark.asyncio
    async def test_logs(self, client):
        r = await client.get("/api/v1/marketing/webhooks/logs")
        assert r.status_code == 200
        assert "items" in r.json()

    @pytest.mark.asyncio
    async def test_stats(self, client):
        r = await client.get("/api/v1/marketing/webhooks/stats")
        assert r.status_code == 200
        data = r.json()
        assert "total" in data
        assert "errors" in data
        assert "success_rate" in data

    @pytest.mark.asyncio
    async def test_health(self, client):
        r = await client.get("/api/v1/marketing/webhooks/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"
