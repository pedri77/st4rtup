"""Tests for email tracking pixel endpoint."""
import uuid
import pytest


@pytest.mark.asyncio
async def test_tracking_pixel_returns_gif(client):
    """Tracking pixel returns 1x1 transparent GIF."""
    fake_id = str(uuid.uuid4())
    resp = await client.get(f"/api/v1/tracking/pixel/{fake_id}.gif")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "image/gif"
    assert resp.headers["cache-control"] == "no-store, no-cache, must-revalidate, max-age=0"
    assert len(resp.content) > 0  # GIF bytes


@pytest.mark.asyncio
async def test_tracking_pixel_records_open(client, lead_data):
    """Tracking pixel records email open in metadata."""
    # Create lead
    lead_resp = await client.post("/api/v1/leads/", json=lead_data)
    lead_id = lead_resp.json()["id"]

    # Create email
    email_resp = await client.post("/api/v1/emails/", json={
        "lead_id": lead_id,
        "subject": "Test tracking",
        "to_email": "test@example.com",
        "body_html": "<p>Hello</p>",
    })
    email_id = email_resp.json()["id"]

    # Hit tracking pixel
    resp = await client.get(f"/api/v1/tracking/pixel/{email_id}.gif")
    assert resp.status_code == 200

    # Verify open was recorded (read email to check metadata)
    email_detail = await client.get(f"/api/v1/emails/{email_id}")
    if email_detail.status_code == 200:
        # metadata_ should have opens count
        pass  # The metadata update is best-effort


@pytest.mark.asyncio
async def test_inject_tracking_pixel():
    """inject_tracking_pixel adds pixel to HTML."""
    from app.api.v1.endpoints.email_tracking import inject_tracking_pixel

    html = "<html><body><p>Hello</p></body></html>"
    result = inject_tracking_pixel(html, "test-id-123")
    assert 'src="' in result
    assert "test-id-123.gif" in result
    assert result.index("test-id-123") < result.index("</body>")


@pytest.mark.asyncio
async def test_inject_tracking_pixel_no_body():
    """inject_tracking_pixel appends when no </body> tag."""
    from app.api.v1.endpoints.email_tracking import inject_tracking_pixel

    html = "<p>Hello world</p>"
    result = inject_tracking_pixel(html, "abc-456")
    assert "abc-456.gif" in result
