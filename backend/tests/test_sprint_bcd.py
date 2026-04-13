"""Tests for Sprint B, C, D features — deal scoring, activity feed, PDF, pipeline rules."""
import pytest
import uuid


# ═══════════════════════════════════════════════════════════════
# Deal Scoring (Sprint B)
# ═══════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_deal_score_nonexistent(client):
    """Score a nonexistent opportunity returns 404."""
    resp = await client.get(f"/api/v1/opportunities/{uuid.uuid4()}/score")
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_deal_score_with_opportunity(client, db_session):
    """Score an existing opportunity returns breakdown."""
    from app.models.lead import Lead
    from app.models.pipeline import Opportunity
    lead = Lead(id=uuid.uuid4(), company_name="Test Co", contact_name="Test", contact_email="test@test.com")
    db_session.add(lead)
    await db_session.flush()
    opp = Opportunity(
        id=uuid.uuid4(), name="Test Deal", stage="qualification",
        value=25000, probability=60, lead_id=lead.id,
    )
    db_session.add(opp)
    await db_session.commit()

    resp = await client.get(f"/api/v1/opportunities/{opp.id}/score")
    assert resp.status_code == 200
    data = resp.json()
    assert "deal_score" in data
    assert "tier" in data
    assert data["tier"] in ("A", "B", "C", "D")
    assert "breakdown" in data
    assert "recommendations" in data
    assert data["breakdown"]["deal_data"]["value"] == 25000


@pytest.mark.asyncio
async def test_score_all_deals(client, db_session):
    """Score-all returns results for open deals."""
    from app.models.lead import Lead
    from app.models.pipeline import Opportunity
    lead = Lead(id=uuid.uuid4(), company_name="Score Co", contact_name="Test", contact_email="score@test.com")
    db_session.add(lead)
    await db_session.flush()
    for i in range(3):
        opp = Opportunity(
            id=uuid.uuid4(), name=f"Deal {i}", stage="proposal",
            value=10000 * (i + 1), probability=50, lead_id=lead.id,
        )
        db_session.add(opp)
    await db_session.commit()

    resp = await client.post("/api/v1/opportunities/score-all")
    assert resp.status_code == 200
    data = resp.json()
    assert data["scored"] >= 3


# ═══════════════════════════════════════════════════════════════
# Activity Feed (Sprint D)
# ═══════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_activity_feed_empty(client):
    """Activity feed for nonexistent lead returns empty."""
    resp = await client.get(f"/api/v1/reports/lead/{uuid.uuid4()}/activity-feed")
    assert resp.status_code == 200
    assert resp.json()["events"] == []


@pytest.mark.asyncio
async def test_activity_feed_with_data(client, db_session):
    """Activity feed returns events from multiple sources."""
    from app.models.lead import Lead
    from app.models.crm import Email, Visit

    lead = Lead(id=uuid.uuid4(), company_name="Feed Test Co", status="new", source="OTHER")
    db_session.add(lead)
    await db_session.flush()

    email = Email(id=uuid.uuid4(), lead_id=lead.id, subject="Hello", status="sent", to_email="test@test.com")
    visit = Visit(id=uuid.uuid4(), lead_id=lead.id, visit_type="presencial", result="positive", visit_date="2026-04-13")
    db_session.add_all([email, visit])
    await db_session.commit()

    resp = await client.get(f"/api/v1/reports/lead/{lead.id}/activity-feed")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 2
    types = {e["type"] for e in data["events"]}
    assert "email" in types
    assert "visit" in types


# ═══════════════════════════════════════════════════════════════
# Pipeline Rules
# ═══════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_list_rules_empty(client):
    """List rules returns empty initially."""
    resp = await client.get("/api/v1/pipeline-rules/")
    assert resp.status_code == 200
    assert resp.json()["rules"] == []


@pytest.mark.asyncio
async def test_create_rule(client):
    """Create a pipeline rule."""
    resp = await client.post("/api/v1/pipeline-rules/", json={
        "name": "Test Rule",
        "trigger_stage": "qualification",
        "actions": [{"type": "notify", "config": {"message": "Test notification"}}],
    })
    assert resp.status_code == 201
    assert resp.json()["created"] is True


@pytest.mark.asyncio
async def test_create_and_list_rule(client):
    """Create then list rules."""
    await client.post("/api/v1/pipeline-rules/", json={
        "name": "Rule for List",
        "trigger_stage": "proposal",
        "actions": [],
    })
    resp = await client.get("/api/v1/pipeline-rules/")
    assert resp.status_code == 200
    assert len(resp.json()["rules"]) >= 1


@pytest.mark.asyncio
async def test_delete_rule(client):
    """Delete a pipeline rule."""
    create = await client.post("/api/v1/pipeline-rules/", json={
        "name": "To Delete",
        "trigger_stage": "discovery",
        "actions": [],
    })
    rule_id = create.json()["id"]
    resp = await client.delete(f"/api/v1/pipeline-rules/{rule_id}")
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_seed_default_rules(client):
    """Seed default pipeline rules."""
    resp = await client.post("/api/v1/pipeline-rules/seed-defaults")
    assert resp.status_code == 200
    assert resp.json()["seeded"] >= 1


# ═══════════════════════════════════════════════════════════════
# Chat Context Builder (Sprint B)
# ═══════════════════════════════════════════════════════════════


@pytest.mark.asyncio
async def test_chat_context_builder(db_session):
    """Build business context returns formatted string."""
    from app.services.chat_context_builder import build_business_context
    context = await build_business_context(db_session, uuid.uuid4())
    # May be empty with no data, but should not error
    assert isinstance(context, str)


@pytest.mark.asyncio
async def test_chat_context_with_data(db_session):
    """Build context with real data includes sections."""
    from app.services.chat_context_builder import build_business_context
    from app.models.lead import Lead
    from app.models.pipeline import Opportunity

    lead = Lead(id=uuid.uuid4(), company_name="Context Test", status="qualified", score=75, source="OTHER")
    db_session.add(lead)
    await db_session.flush()

    opp = Opportunity(id=uuid.uuid4(), name="Context Deal", lead_id=lead.id, stage="proposal", value=30000, probability=70)
    db_session.add(opp)
    await db_session.commit()

    context = await build_business_context(db_session, uuid.uuid4())
    assert "PIPELINE" in context or "LEADS" in context


# ═══════════════════════════════════════════════════════════════
# PDF Report Generator (Sprint D)
# ═══════════════════════════════════════════════════════════════


def test_generate_pipeline_pdf():
    """Pipeline PDF generation produces valid bytes."""
    from app.services.pdf_report_generator import generate_pipeline_report
    data = {
        "open_deals": 5, "total_value": 100000, "weighted_value": 60000,
        "win_rate": 45, "avg_deal_size": 20000,
        "by_stage": [{"stage": "proposal", "count": 3, "value": 75000, "avg_probability": 60}],
        "top_deals": [{"company": "Test Corp", "value": 50000, "stage": "negotiation", "probability": 80}],
    }
    pdf_bytes = generate_pipeline_report(data)
    assert len(pdf_bytes) > 1000
    assert pdf_bytes[:5] == b"%PDF-"


def test_generate_activity_pdf():
    """Activity PDF generation produces valid bytes."""
    from app.services.pdf_report_generator import generate_activity_report
    data = {
        "period": "Ultimos 30 dias", "new_leads": 12, "visits": 8,
        "emails_sent": 25, "actions_completed": 15, "deals_won": 2, "revenue": 45000,
    }
    pdf_bytes = generate_activity_report(data)
    assert len(pdf_bytes) > 1000
    assert pdf_bytes[:5] == b"%PDF-"


# ═══════════════════════════════════════════════════════════════
# Email Click Tracking (Sprint C)
# ═══════════════════════════════════════════════════════════════


def test_wrap_links_for_tracking():
    """Link wrapping replaces hrefs with tracking URLs."""
    from app.api.v1.endpoints.email_tracking import wrap_links_for_tracking
    html = '<a href="https://example.com/page">Click</a> <a href="mailto:test@test.com">Mail</a>'
    result = wrap_links_for_tracking(html, "test-email-id")
    assert "tracking/click/test-email-id" in result
    assert "mailto:test@test.com" in result  # mailto not wrapped


def test_inject_tracking_pixel():
    """Pixel injection adds img tag before closing body."""
    from app.api.v1.endpoints.email_tracking import inject_tracking_pixel
    html = "<html><body><p>Hi</p></body></html>"
    result = inject_tracking_pixel(html, "test-id")
    assert "tracking/pixel/test-id.gif" in result
    assert result.index("pixel") < result.index("</body>")
