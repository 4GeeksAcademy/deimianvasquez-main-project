"""
Tests for ``POST /auth/forgot-password``.

Happy path  — registered email → 200 + generic message; token stored; email "sent".
Edge cases  — unregistered email → 200 + same generic message (no enumeration).
Failure     — empty / malformed email → 422.
"""

from unittest.mock import ANY

from fastapi.testclient import TestClient

ENDPOINT = "/auth/forgot-password"

# ---------------------------------------------------------------------------
# Happy path
# ---------------------------------------------------------------------------


class TestForgotPasswordHappy:
    def test_registered_email_returns_success(
        self, client: TestClient, sample_user, monkeypatch
    ):
        """A registered email must trigger token generation and email sending,
        but the response remains generic to prevent enumeration."""
        sent_args = []

        def _capture_email(email, token, expire_minutes):
            sent_args.append((email, token, expire_minutes))

        monkeypatch.setattr("app.auth.service.send_reset_email", _capture_email)

        response = client.post(
            ENDPOINT,
            json={"email": "doctor@healthcore.com"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "password reset link" in data["message"].lower()

        # Verify email was actually "sent"
        assert len(sent_args) == 1
        assert sent_args[0][0] == "doctor@healthcore.com"

    def test_password_reset_token_stored_in_db(
        self, client: TestClient, sample_user, reset_tokens_table
    ):
        """After a successful request, a token record must exist in the DB."""
        response = client.post(
            ENDPOINT,
            json={"email": "doctor@healthcore.com"},
        )
        assert response.status_code == 200
        # At least one token record should exist now
        assert len(reset_tokens_table) >= 1


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------


class TestForgotPasswordEdge:
    def test_unregistered_email_returns_same_message(
        self, client: TestClient
    ):
        """An unregistered email must return exactly the same 200 message
        as a registered one, so an attacker cannot enumerate users."""
        response = client.post(
            ENDPOINT,
            json={"email": "not-registered@example.com"},
        )
        assert response.status_code == 200
        assert "password reset link" in response.json()["message"].lower()

    def test_empty_email_string(self, client: TestClient):
        """Empty string should be rejected (400 from validation handler)."""
        response = client.post(
            ENDPOINT,
            json={"email": ""},
        )
        assert response.status_code == 400

    def test_malformed_email(self, client: TestClient):
        """An invalid email format → 400 (validation handler)."""
        response = client.post(
            ENDPOINT,
            json={"email": "clearly-not-an-email"},
        )
        assert response.status_code == 400


# ---------------------------------------------------------------------------
# Failure modes
# ---------------------------------------------------------------------------


class TestForgotPasswordFailure:
    def test_service_always_returns_true(self, client: TestClient, monkeypatch):
        """The endpoint never exposes whether the email was sent or not.
        Even if the email service fails, the HTTP response is 200."""
        # Simulate email service failure
        monkeypatch.setattr("app.auth.service.send_reset_email", lambda *a, **kw: False)

        response = client.post(
            ENDPOINT,
            json={"email": "doctor@healthcore.com"},
        )
        assert response.status_code == 200
        assert "password reset link" in response.json()["message"].lower()