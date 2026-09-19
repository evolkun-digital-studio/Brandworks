"""HTTP-level tests for the Exotel webhook routes.

Regression coverage for two bugs found during the pre-API production audit
(see docs/pre_api_audit.md):
  - a webhook payload with a missing/empty CallSid was silently accepted and
    written to the database instead of being rejected;
  - a redelivered ("duplicate") incoming-call webhook crashed with an
    unhandled 500 (UniqueViolation) instead of being handled idempotently.
"""

from __future__ import annotations

from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from app.core.dependencies import get_db
from app.main import app
from app.services.call_service import CallService


def _client() -> TestClient:
    app.dependency_overrides[get_db] = lambda: AsyncMock()
    return TestClient(app, raise_server_exceptions=False)


class TestIncomingWebhookValidation:
    def teardown_method(self) -> None:
        app.dependency_overrides.clear()

    def test_missing_call_sid_is_rejected(self):
        client = _client()
        with patch.object(CallService, "initiate", AsyncMock()):
            response = client.post("/api/v1/telephony/incoming", data={"From": "+919999999999"})

        assert response.status_code == 422
        assert response.json()["error"]["code"] == "VALIDATION_ERROR"

    def test_empty_body_is_rejected_not_500(self):
        client = _client()
        with patch.object(CallService, "initiate", AsyncMock()):
            response = client.post("/api/v1/telephony/incoming")

        assert response.status_code == 422

    def test_valid_payload_is_accepted(self):
        client = _client()
        with patch.object(CallService, "initiate", AsyncMock()) as initiate_mock:
            response = client.post(
                "/api/v1/telephony/incoming",
                data={"CallSid": "CA123", "From": "+919999999999", "To": "+910000000000"},
            )

        assert response.status_code == 200
        assert response.json()["message"] == "Call accepted"
        initiate_mock.assert_awaited_once()

    def test_status_webhook_missing_call_sid_is_rejected(self):
        client = _client()
        with patch.object(CallService, "update_status", AsyncMock()):
            response = client.post("/api/v1/telephony/status", data={"CallStatus": "in-progress"})

        assert response.status_code == 422
        assert response.json()["error"]["code"] == "VALIDATION_ERROR"


class TestCallServiceIdempotency:
    def test_duplicate_webhook_delivery_does_not_crash(self):
        """CallService.initiate() is idempotent — see test_database.py for the unit test."""
        client = _client()
        with patch.object(CallService, "initiate", AsyncMock()) as initiate_mock:
            first = client.post(
                "/api/v1/telephony/incoming",
                data={"CallSid": "CA_DUP", "From": "+919999999999"},
            )
            second = client.post(
                "/api/v1/telephony/incoming",
                data={"CallSid": "CA_DUP", "From": "+919999999999"},
            )

        assert first.status_code == 200
        assert second.status_code == 200
        assert initiate_mock.await_count == 2
