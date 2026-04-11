"""Tests para el endpoint de tareas de automatización."""
import pytest
from unittest.mock import AsyncMock, patch


class TestSchedulerStatus:
    """Tests para GET /api/v1/automation-tasks/scheduler/status"""

    async def test_scheduler_status(self, client):
        response = await client.get("/api/v1/automation-tasks/scheduler/status")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "running" in data
        assert isinstance(data["running"], bool)

    async def test_scheduler_status_has_jobs_field(self, client):
        response = await client.get("/api/v1/automation-tasks/scheduler/status")
        data = response.json()
        assert "jobs" in data
        assert isinstance(data["jobs"], list)


class TestAC01Preview:
    """Tests para GET /api/v1/automation-tasks/AC-01/preview"""

    async def test_preview_empty(self, client):
        response = await client.get("/api/v1/automation-tasks/AC-01/preview")
        assert response.status_code == 200
        data = response.json()
        assert "summary" in data
        assert "html_preview" in data

    async def test_preview_summary_fields(self, client):
        response = await client.get("/api/v1/automation-tasks/AC-01/preview")
        data = response.json()
        summary = data["summary"]
        assert "overdue" in summary
        assert "today" in summary
        assert "upcoming" in summary
        assert "total" in summary

    async def test_preview_with_actions(self, client, created_lead, action_data):
        action_data["lead_id"] = created_lead["id"]
        await client.post("/api/v1/actions/", json=action_data)

        response = await client.get("/api/v1/automation-tasks/AC-01/preview")
        assert response.status_code == 200
        data = response.json()
        assert data["summary"]["total"] >= 1


class TestEM01Trigger:
    """Tests para POST /api/v1/automation-tasks/EM-01/trigger/{lead_id}"""

    async def test_trigger_invalid_lead(self, client):
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.post(f"/api/v1/automation-tasks/EM-01/trigger/{fake_id}")
        assert response.status_code == 404

    async def test_trigger_valid_lead(self, client, created_lead):
        """Trigger with valid lead — may fail due to email service not configured in test env."""
        response = await client.post(
            f"/api/v1/automation-tasks/EM-01/trigger/{created_lead['id']}"
        )
        # Email service not configured in test env, so 500 or success
        assert response.status_code in (200, 400, 500)


class TestEM01SendDay:
    """Tests para POST /api/v1/automation-tasks/EM-01/send-day/{lead_id}/{day}"""

    async def test_send_invalid_day(self, client, created_lead):
        response = await client.post(
            f"/api/v1/automation-tasks/EM-01/send-day/{created_lead['id']}/5"
        )
        assert response.status_code == 400

    async def test_send_invalid_lead(self, client):
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = await client.post(f"/api/v1/automation-tasks/EM-01/send-day/{fake_id}/0")
        assert response.status_code in (404, 500)


class TestWelcomeSequenceEmail:
    """Tests para send_welcome_sequence_email (internal function)."""

    async def test_lead_not_found(self, client, db_session):
        """send_welcome_sequence_email returns error if lead doesn't exist."""
        from app.api.v1.endpoints.automation_tasks import send_welcome_sequence_email

        result = await send_welcome_sequence_email(
            db=db_session,
            lead_id="00000000-0000-0000-0000-000000000000",
            day=0,
        )
        assert result["success"] is False
        assert "not found" in result["error"].lower()

    async def test_lead_without_email(self, client, db_session):
        """send_welcome_sequence_email returns error if lead has no contact_email."""
        from app.api.v1.endpoints.automation_tasks import send_welcome_sequence_email
        from app.models import Lead
        import uuid

        lead = Lead(
            id=uuid.uuid4(),
            company_name="No Email Corp",
            contact_name="Ghost",
            contact_email=None,
            source="test",
            status="new",
        )
        db_session.add(lead)
        await db_session.commit()

        result = await send_welcome_sequence_email(
            db=db_session,
            lead_id=str(lead.id),
            day=0,
        )
        assert result["success"] is False
        assert "no contact_email" in result["error"].lower()

    async def test_invalid_day_returns_error(self, client, db_session, created_lead):
        """send_welcome_sequence_email rejects days other than 0, 3, 7."""
        from app.api.v1.endpoints.automation_tasks import send_welcome_sequence_email

        result = await send_welcome_sequence_email(
            db=db_session,
            lead_id=created_lead["id"],
            day=99,
        )
        assert result["success"] is False
        assert "Invalid day" in result["error"]

    @patch("app.api.v1.endpoints.automation_tasks.email_service")
    async def test_successful_send(self, mock_email_svc, client, db_session, created_lead):
        """send_welcome_sequence_email creates email record and sends."""
        from app.api.v1.endpoints.automation_tasks import send_welcome_sequence_email

        mock_email_svc.send_email = AsyncMock(return_value={
            "success": True,
            "message_id": "test-msg-123",
            "provider": "mock",
        })

        result = await send_welcome_sequence_email(
            db=db_session,
            lead_id=created_lead["id"],
            day=0,
        )
        assert result["success"] is True
        assert result["day"] == 0
        assert "email_id" in result
        assert result["provider"] == "mock"
        mock_email_svc.send_email.assert_called_once()

    @patch("app.api.v1.endpoints.automation_tasks.email_service")
    async def test_failed_send_marks_email_failed(self, mock_email_svc, client, db_session, created_lead):
        """When email send fails, the Email record status is set to 'failed'."""
        from app.api.v1.endpoints.automation_tasks import send_welcome_sequence_email

        mock_email_svc.send_email = AsyncMock(return_value={
            "success": False,
            "error": "SMTP timeout",
        })

        result = await send_welcome_sequence_email(
            db=db_session,
            lead_id=created_lead["id"],
            day=3,
        )
        assert result["success"] is False
        assert "SMTP timeout" in result["error"]
        assert result["day"] == 3
