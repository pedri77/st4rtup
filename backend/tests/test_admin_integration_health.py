"""Tests for the admin integration health dashboard endpoint."""
import pytest
from uuid import uuid4


@pytest.mark.asyncio
async def test_integration_health_returns_shape(client, db_session):
    """Endpoint returns orgs + summary with the expected keys."""
    resp = await client.get("/api/v1/admin/integration-health")
    assert resp.status_code == 200, resp.text

    data = resp.json()
    assert "orgs" in data
    assert "summary" in data
    assert isinstance(data["orgs"], list)

    summary = data["summary"]
    for key in ("total_orgs", "orgs_with_oauth", "active_automations"):
        assert key in summary, f"summary missing '{key}'"
        assert isinstance(summary[key], int)


@pytest.mark.asyncio
async def test_integration_health_includes_test_org(client, db_session):
    """The test org from conftest should appear in the response."""
    resp = await client.get("/api/v1/admin/integration-health")
    assert resp.status_code == 200

    data = resp.json()
    # conftest always inserts a test org via the client fixture
    assert data["summary"]["total_orgs"] >= 1
    assert len(data["orgs"]) >= 1

    org = data["orgs"][0]
    # Required per-org keys
    for key in ("org_id", "name", "slug", "plan", "integrations", "automations"):
        assert key in org, f"org missing '{key}'"

    # Automations block
    for key in ("total", "active", "failing_24h"):
        assert key in org["automations"]
        assert isinstance(org["automations"][key], int)

    # Integrations block — must have the 8 expected providers
    expected_integrations = {
        "gmail", "gsc", "gcalendar", "gdrive",
        "linkedin", "youtube", "brevo", "telegram",
    }
    assert expected_integrations.issubset(org["integrations"].keys())


@pytest.mark.asyncio
async def test_integration_health_integration_shape(client, db_session):
    """Each integration entry has connected + metadata fields."""
    resp = await client.get("/api/v1/admin/integration-health")
    assert resp.status_code == 200
    data = resp.json()

    for org in data["orgs"]:
        for name, info in org["integrations"].items():
            assert "connected" in info, f"{name} missing 'connected'"
            assert isinstance(info["connected"], bool)
            # token_age_days must exist (may be None when not connected)
            assert "token_age_days" in info


@pytest.mark.asyncio
async def test_integration_health_empty_state(client, db_session):
    """With no OAuth configured, all integrations report connected=False."""
    resp = await client.get("/api/v1/admin/integration-health")
    assert resp.status_code == 200
    data = resp.json()

    # Sum of connected integrations across all orgs should be 0
    # (conftest doesn't seed any SystemSettings rows)
    connected_count = sum(
        1
        for org in data["orgs"]
        for info in org["integrations"].values()
        if info.get("connected")
    )
    assert connected_count == 0
    assert data["summary"]["orgs_with_oauth"] == 0


@pytest.mark.asyncio
async def test_integration_health_requires_admin(client, db_session):
    """Non-admin users get 403 (handled by require_admin dep)."""
    # The conftest client fixture uses an admin user by default, so we
    # override just get_current_user to return a viewer role.
    from app.main import app
    from app.core.security import get_current_user

    def override_viewer():
        return {
            "user_id": str(uuid4()),
            "email": "viewer@test.app",
            "role": "viewer",
            "user_metadata": {},
        }

    original = app.dependency_overrides.get(get_current_user)
    app.dependency_overrides[get_current_user] = override_viewer

    try:
        resp = await client.get("/api/v1/admin/integration-health")
        assert resp.status_code == 403
    finally:
        if original:
            app.dependency_overrides[get_current_user] = original
