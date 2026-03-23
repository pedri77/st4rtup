"""Tests para los endpoints del módulo Marketing Hub."""
import pytest


# ─── Campaign fixtures ──────────────────────────────────────────

CAMPAIGN_DATA = {
    "name": "LinkedIn Ads Q1 - CISO España",
    "objective": "lead_gen",
    "channel": "linkedin_ads",
    "status": "draft",
    "budget_total": 5000,
    "persona_target": "CISO",
    "regulatory_focus": "NIS2",
    "geo_target": ["ES", "PT"],
    "leads_goal": 100,
    "mqls_goal": 30,
    "max_cpl": 50.0,
    "start_date": "2026-04-01",
    "end_date": "2026-06-30",
}

FUNNEL_DATA = {
    "name": "Funnel NIS2 - Awareness to MQL",
    "description": "Funnel para captación de leads NIS2",
    "status": "draft",
    "stages": [
        {"name": "Awareness", "channel": "LinkedIn", "asset": "Landing NIS2", "cta": "Descargar guía", "trigger_score": 0},
        {"name": "Consideración", "channel": "Email", "asset": "Whitepaper", "cta": "Solicitar demo", "trigger_score": 20},
        {"name": "Decisión", "channel": "Sales", "asset": "Demo", "cta": "Ver precios", "trigger_score": 50},
    ],
}

UTM_DATA = {
    "base_url": "https://st4rtup.app/nis2",
    "utm_source": "linkedin",
    "utm_medium": "cpc",
    "utm_campaign": "nis2-q1-2026",
    "utm_content": "banner-top",
    "utm_term": "ciberseguridad nis2",
}

CALENDAR_EVENT_DATA = {
    "title": "Artículo NIS2 - Blog",
    "event_type": "seo_article",
    "channel": "Blog",
    "description": "Publicar artículo sobre plazos NIS2",
    "start_date": "2026-04-15T09:00:00Z",
    "all_day": True,
}

ALERT_DATA = {
    "alert_type": "high_cpl",
    "severity": "warning",
    "entity_type": "campaign",
    "entity_name": "LinkedIn Ads Q1",
    "message": "CPL supera el umbral de €50",
    "threshold_value": 50.0,
    "actual_value": 67.0,
    "geo_context": "ES",
}

ASSET_DATA = {
    "type": "landing_page",
    "name": "Landing NIS2 España",
    "url": "https://st4rtup.app/nis2-es",
    "status": "active",
    "language": "es",
}


# ─── Campaigns ──────────────────────────────────────────────────

class TestCampaigns:
    async def test_list_empty(self, client):
        r = await client.get("/api/v1/marketing/campaigns")
        assert r.status_code == 200
        assert r.json()["total"] == 0

    async def test_create(self, client):
        r = await client.post("/api/v1/marketing/campaigns", json=CAMPAIGN_DATA)
        assert r.status_code == 201
        d = r.json()
        assert d["name"] == CAMPAIGN_DATA["name"]
        assert d["objective"] == "lead_gen"
        assert d["channel"] == "linkedin_ads"
        assert d["budget_total"] == 5000
        assert "id" in d

    async def test_get(self, client):
        cr = await client.post("/api/v1/marketing/campaigns", json=CAMPAIGN_DATA)
        cid = cr.json()["id"]
        r = await client.get(f"/api/v1/marketing/campaigns/{cid}")
        assert r.status_code == 200
        assert r.json()["name"] == CAMPAIGN_DATA["name"]

    async def test_update(self, client):
        cr = await client.post("/api/v1/marketing/campaigns", json=CAMPAIGN_DATA)
        cid = cr.json()["id"]
        r = await client.put(f"/api/v1/marketing/campaigns/{cid}", json={"status": "active"})
        assert r.status_code == 200
        assert r.json()["status"] == "active"

    async def test_delete(self, client):
        cr = await client.post("/api/v1/marketing/campaigns", json=CAMPAIGN_DATA)
        cid = cr.json()["id"]
        r = await client.delete(f"/api/v1/marketing/campaigns/{cid}")
        assert r.status_code == 204

    async def test_filter_by_status(self, client):
        await client.post("/api/v1/marketing/campaigns", json=CAMPAIGN_DATA)
        await client.post("/api/v1/marketing/campaigns", json={**CAMPAIGN_DATA, "name": "Otra", "status": "active"})
        r = await client.get("/api/v1/marketing/campaigns?status=active")
        assert r.json()["total"] == 1

    async def test_filter_by_channel(self, client):
        await client.post("/api/v1/marketing/campaigns", json=CAMPAIGN_DATA)
        await client.post("/api/v1/marketing/campaigns", json={**CAMPAIGN_DATA, "name": "SEO", "channel": "seo"})
        r = await client.get("/api/v1/marketing/campaigns?channel=seo")
        assert r.json()["total"] == 1
        assert r.json()["items"][0]["channel"] == "seo"

    async def test_not_found(self, client):
        r = await client.get("/api/v1/marketing/campaigns/00000000-0000-0000-0000-000000000000")
        assert r.status_code == 404


# ─── Funnels ────────────────────────────────────────────────────

class TestFunnels:
    async def test_list_empty(self, client):
        r = await client.get("/api/v1/marketing/funnels")
        assert r.status_code == 200
        assert r.json()["total"] == 0

    async def test_create(self, client):
        r = await client.post("/api/v1/marketing/funnels", json=FUNNEL_DATA)
        assert r.status_code == 201
        d = r.json()
        assert d["name"] == FUNNEL_DATA["name"]
        assert len(d["stages"]) == 3

    async def test_update_stages(self, client):
        cr = await client.post("/api/v1/marketing/funnels", json=FUNNEL_DATA)
        fid = cr.json()["id"]
        new_stages = [{"name": "Top", "channel": "", "asset": "", "cta": "", "trigger_score": 0}]
        r = await client.put(f"/api/v1/marketing/funnels/{fid}", json={"stages": new_stages})
        assert r.status_code == 200
        assert len(r.json()["stages"]) == 1

    async def test_delete(self, client):
        cr = await client.post("/api/v1/marketing/funnels", json=FUNNEL_DATA)
        fid = cr.json()["id"]
        r = await client.delete(f"/api/v1/marketing/funnels/{fid}")
        assert r.status_code == 204

    async def test_with_campaign(self, client):
        camp = await client.post("/api/v1/marketing/campaigns", json=CAMPAIGN_DATA)
        cid = camp.json()["id"]
        r = await client.post("/api/v1/marketing/funnels", json={**FUNNEL_DATA, "campaign_id": cid})
        assert r.status_code == 201
        assert r.json()["campaign_id"] == cid


# ─── Marketing Assets ───────────────────────────────────────────

class TestMarketingAssets:
    async def test_list_empty(self, client):
        r = await client.get("/api/v1/marketing/assets")
        assert r.status_code == 200
        assert r.json()["total"] == 0

    async def test_create(self, client):
        r = await client.post("/api/v1/marketing/assets", json=ASSET_DATA)
        assert r.status_code == 201
        d = r.json()
        assert d["name"] == ASSET_DATA["name"]
        assert d["type"] == "landing_page"
        assert d["visits"] == 0

    async def test_update_metrics(self, client):
        cr = await client.post("/api/v1/marketing/assets", json=ASSET_DATA)
        aid = cr.json()["id"]
        r = await client.put(f"/api/v1/marketing/assets/{aid}", json={"visits": 500, "conversions": 25})
        assert r.status_code == 200
        assert r.json()["visits"] == 500
        assert r.json()["conversions"] == 25

    async def test_delete(self, client):
        cr = await client.post("/api/v1/marketing/assets", json=ASSET_DATA)
        aid = cr.json()["id"]
        r = await client.delete(f"/api/v1/marketing/assets/{aid}")
        assert r.status_code == 204

    async def test_filter_by_language(self, client):
        await client.post("/api/v1/marketing/assets", json=ASSET_DATA)
        await client.post("/api/v1/marketing/assets", json={**ASSET_DATA, "name": "Landing EN", "language": "en"})
        r = await client.get("/api/v1/marketing/assets?language=en")
        assert r.json()["total"] == 1
        assert r.json()["items"][0]["language"] == "en"

    async def test_filter_by_type(self, client):
        await client.post("/api/v1/marketing/assets", json=ASSET_DATA)
        await client.post("/api/v1/marketing/assets", json={**ASSET_DATA, "name": "CTA Btn", "type": "cta_button"})
        r = await client.get("/api/v1/marketing/assets?type=cta_button")
        assert r.json()["total"] == 1
        assert r.json()["items"][0]["type"] == "cta_button"

    async def test_hreflang_field(self, client):
        r = await client.post("/api/v1/marketing/assets", json={**ASSET_DATA, "has_hreflang": True})
        assert r.status_code == 201
        assert r.json()["has_hreflang"] is True

    async def test_get_detail(self, client):
        cr = await client.post("/api/v1/marketing/assets", json=ASSET_DATA)
        aid = cr.json()["id"]
        r = await client.get(f"/api/v1/marketing/assets/{aid}")
        assert r.status_code == 200
        assert r.json()["name"] == ASSET_DATA["name"]
        assert r.json()["language"] == "es"

    async def test_not_found(self, client):
        r = await client.get("/api/v1/marketing/assets/00000000-0000-0000-0000-000000000000")
        assert r.status_code == 404


# ─── UTM Codes ──────────────────────────────────────────────────

class TestUTMCodes:
    async def test_list_empty(self, client):
        r = await client.get("/api/v1/marketing/utm-codes")
        assert r.status_code == 200
        assert r.json()["total"] == 0

    async def test_create_generates_full_url(self, client):
        r = await client.post("/api/v1/marketing/utm-codes", json=UTM_DATA)
        assert r.status_code == 201
        d = r.json()
        assert d["utm_source"] == "linkedin"
        assert "full_url" in d
        assert "utm_source=linkedin" in d["full_url"]
        assert "utm_medium=cpc" in d["full_url"]
        assert "utm_campaign=nis2-q1-2026" in d["full_url"]
        assert d["full_url"].startswith(UTM_DATA["base_url"])

    async def test_delete(self, client):
        cr = await client.post("/api/v1/marketing/utm-codes", json=UTM_DATA)
        uid = cr.json()["id"]
        r = await client.delete(f"/api/v1/marketing/utm-codes/{uid}")
        assert r.status_code == 204

    async def test_get(self, client):
        cr = await client.post("/api/v1/marketing/utm-codes", json=UTM_DATA)
        uid = cr.json()["id"]
        r = await client.get(f"/api/v1/marketing/utm-codes/{uid}")
        assert r.status_code == 200
        assert r.json()["utm_source"] == "linkedin"


# ─── Calendar Events ────────────────────────────────────────────

class TestCalendarEvents:
    async def test_list_empty(self, client):
        r = await client.get("/api/v1/marketing/calendar")
        assert r.status_code == 200
        assert r.json()["total"] == 0

    async def test_create(self, client):
        r = await client.post("/api/v1/marketing/calendar", json=CALENDAR_EVENT_DATA)
        assert r.status_code == 201
        d = r.json()
        assert d["title"] == CALENDAR_EVENT_DATA["title"]
        assert d["event_type"] == "seo_article"
        assert d["all_day"] is True

    async def test_update(self, client):
        cr = await client.post("/api/v1/marketing/calendar", json=CALENDAR_EVENT_DATA)
        eid = cr.json()["id"]
        r = await client.put(f"/api/v1/marketing/calendar/{eid}", json={"title": "Artículo actualizado"})
        assert r.status_code == 200
        assert r.json()["title"] == "Artículo actualizado"

    async def test_delete(self, client):
        cr = await client.post("/api/v1/marketing/calendar", json=CALENDAR_EVENT_DATA)
        eid = cr.json()["id"]
        r = await client.delete(f"/api/v1/marketing/calendar/{eid}")
        assert r.status_code == 204


# ─── Alerts ─────────────────────────────────────────────────────

class TestMarketingAlerts:
    async def test_list_empty(self, client):
        r = await client.get("/api/v1/marketing/alerts")
        assert r.status_code == 200
        assert r.json()["total"] == 0

    async def test_create(self, client):
        r = await client.post("/api/v1/marketing/alerts", json=ALERT_DATA)
        assert r.status_code == 201
        d = r.json()
        assert d["alert_type"] == "high_cpl"
        assert d["severity"] == "warning"
        assert d["is_read"] is False

    async def test_mark_read(self, client):
        cr = await client.post("/api/v1/marketing/alerts", json=ALERT_DATA)
        aid = cr.json()["id"]
        r = await client.patch(f"/api/v1/marketing/alerts/{aid}", json={"is_read": True})
        assert r.status_code == 200
        assert r.json()["is_read"] is True

    async def test_stats(self, client):
        await client.post("/api/v1/marketing/alerts", json=ALERT_DATA)
        await client.post("/api/v1/marketing/alerts", json={**ALERT_DATA, "severity": "critical"})
        r = await client.get("/api/v1/marketing/alerts/stats")
        assert r.status_code == 200
        d = r.json()
        assert d["total"] == 2
        assert d["unread"] == 2
        assert "by_severity" in d

    async def test_mark_all_read(self, client):
        await client.post("/api/v1/marketing/alerts", json=ALERT_DATA)
        await client.post("/api/v1/marketing/alerts", json={**ALERT_DATA, "message": "Otra alerta"})
        r = await client.post("/api/v1/marketing/alerts/mark-all-read")
        assert r.status_code == 200
        # Verify all are read
        lr = await client.get("/api/v1/marketing/alerts?is_read=true")
        assert lr.json()["total"] == 2

    async def test_delete(self, client):
        cr = await client.post("/api/v1/marketing/alerts", json=ALERT_DATA)
        aid = cr.json()["id"]
        r = await client.delete(f"/api/v1/marketing/alerts/{aid}")
        assert r.status_code == 204

    async def test_filter_severity(self, client):
        await client.post("/api/v1/marketing/alerts", json=ALERT_DATA)
        await client.post("/api/v1/marketing/alerts", json={**ALERT_DATA, "severity": "critical"})
        r = await client.get("/api/v1/marketing/alerts?severity=critical")
        assert r.json()["total"] == 1


# ─── Analytics ──────────────────────────────────────────────────

class TestMarketingAnalytics:
    async def test_overview_empty(self, client):
        r = await client.get("/api/v1/marketing/analytics/overview")
        assert r.status_code == 200
        d = r.json()
        assert d["campaigns"]["total"] == 0
        assert d["budget"]["total"] == 0
        assert d["assets"]["total"] == 0

    async def test_overview_with_data(self, client):
        await client.post("/api/v1/marketing/campaigns", json=CAMPAIGN_DATA)
        await client.post("/api/v1/marketing/campaigns", json={**CAMPAIGN_DATA, "name": "SEO", "channel": "seo", "status": "active"})
        await client.post("/api/v1/marketing/alerts", json=ALERT_DATA)

        r = await client.get("/api/v1/marketing/analytics/overview")
        assert r.status_code == 200
        d = r.json()
        assert d["campaigns"]["total"] == 2
        assert d["campaigns"]["active"] == 1
        assert "linkedin_ads" in d["campaigns"]["by_channel"]
        assert d["budget"]["total"] == 10000
        assert d["counts"]["alerts_total"] == 1


# ─── Documents ─────────────────────────────────────────────────

DOCUMENT_DATA = {
    "name": "Guía NIS2 para CISOs",
    "folder": "content",
    "file_type": "pdf",
    "status": "draft",
    "language": "es",
    "description": "Guía completa sobre cumplimiento NIS2",
    "regulatory_focus": "NIS2",
    "persona_target": "CISO",
    "tags": ["nis2", "guía", "ciso"],
}


class TestMarketingDocuments:
    async def test_create(self, client):
        r = await client.post("/api/v1/marketing/documents", json=DOCUMENT_DATA)
        assert r.status_code == 201
        d = r.json()
        assert d["name"] == DOCUMENT_DATA["name"]
        assert d["folder"] == "content"
        assert d["status"] == "draft"
        assert d["language"] == "es"
        assert d["version"] == 1
        assert d["regulatory_focus"] == "NIS2"
        assert d["persona_target"] == "CISO"
        assert d["tags"] == ["nis2", "guía", "ciso"]

    async def test_list(self, client):
        await client.post("/api/v1/marketing/documents", json=DOCUMENT_DATA)
        r = await client.get("/api/v1/marketing/documents")
        assert r.status_code == 200
        assert r.json()["total"] >= 1

    async def test_get_detail(self, client):
        cr = await client.post("/api/v1/marketing/documents", json=DOCUMENT_DATA)
        doc_id = cr.json()["id"]
        r = await client.get(f"/api/v1/marketing/documents/{doc_id}")
        assert r.status_code == 200
        assert r.json()["name"] == DOCUMENT_DATA["name"]

    async def test_update(self, client):
        cr = await client.post("/api/v1/marketing/documents", json=DOCUMENT_DATA)
        doc_id = cr.json()["id"]
        r = await client.put(f"/api/v1/marketing/documents/{doc_id}", json={
            "name": "Guía NIS2 v2",
            "status": "published",
        })
        assert r.status_code == 200
        assert r.json()["name"] == "Guía NIS2 v2"
        assert r.json()["status"] == "published"

    async def test_delete(self, client):
        cr = await client.post("/api/v1/marketing/documents", json=DOCUMENT_DATA)
        doc_id = cr.json()["id"]
        r = await client.delete(f"/api/v1/marketing/documents/{doc_id}")
        assert r.status_code == 204

    async def test_not_found(self, client):
        r = await client.get("/api/v1/marketing/documents/00000000-0000-0000-0000-000000000000")
        assert r.status_code == 404

    async def test_filter_by_folder(self, client):
        await client.post("/api/v1/marketing/documents", json=DOCUMENT_DATA)
        await client.post("/api/v1/marketing/documents", json={**DOCUMENT_DATA, "folder": "legal"})
        r = await client.get("/api/v1/marketing/documents?folder=legal")
        assert r.json()["total"] == 1

    async def test_filter_by_status(self, client):
        await client.post("/api/v1/marketing/documents", json=DOCUMENT_DATA)
        await client.post("/api/v1/marketing/documents", json={**DOCUMENT_DATA, "status": "published"})
        r = await client.get("/api/v1/marketing/documents?status=published")
        assert r.json()["total"] == 1

    async def test_filter_by_language(self, client):
        await client.post("/api/v1/marketing/documents", json=DOCUMENT_DATA)
        await client.post("/api/v1/marketing/documents", json={**DOCUMENT_DATA, "language": "en"})
        r = await client.get("/api/v1/marketing/documents?language=en")
        assert r.json()["total"] == 1

    async def test_search(self, client):
        await client.post("/api/v1/marketing/documents", json=DOCUMENT_DATA)
        await client.post("/api/v1/marketing/documents", json={**DOCUMENT_DATA, "name": "Battlecard DORA"})
        r = await client.get("/api/v1/marketing/documents?search=DORA")
        assert r.json()["total"] == 1

    async def test_stats(self, client):
        await client.post("/api/v1/marketing/documents", json=DOCUMENT_DATA)
        await client.post("/api/v1/marketing/documents", json={**DOCUMENT_DATA, "folder": "legal", "status": "published"})
        r = await client.get("/api/v1/marketing/documents/stats")
        assert r.status_code == 200
        d = r.json()
        assert d["total"] == 2
        assert "content" in d["by_folder"]
        assert "legal" in d["by_folder"]

    async def test_entity_links(self, client):
        cr = await client.post("/api/v1/marketing/documents", json=DOCUMENT_DATA)
        doc_id = cr.json()["id"]
        # Create link
        lr = await client.post(f"/api/v1/marketing/documents/{doc_id}/links", json={
            "entity_type": "lead",
            "entity_id": "00000000-0000-0000-0000-000000000001",
        })
        assert lr.status_code == 201
        link_id = lr.json()["id"]
        # List links
        r = await client.get(f"/api/v1/marketing/documents/{doc_id}/links")
        assert len(r.json()) == 1
        # Delete link
        dr = await client.delete(f"/api/v1/marketing/documents/{doc_id}/links/{link_id}")
        assert dr.status_code == 204
