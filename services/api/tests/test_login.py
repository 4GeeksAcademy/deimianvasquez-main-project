"""
Tests for ``POST /auth/login``.

Happy path  — valid credentials for an active user → 200 + JWT + cookie.
Edge cases  — empty password field; invalid email format.
Failure     — unregistered email; wrong password; deactivated account.
"""

from fastapi.testclient import TestClient

from app.core.security import hash_password

ENDPOINT = "/auth/login"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _activate_user(users_table, user_id: int):
    """Set `is_active` back to True for a given user."""
    users_table.update({"is_active": True}, doc_ids=[user_id])


# ---------------------------------------------------------------------------
# Happy path
# ---------------------------------------------------------------------------


class TestLoginHappy:
    def test_valid_credentials_returns_token_and_cookie(self, client: TestClient, sample_user):
        response = client.post(
            ENDPOINT,
            json={"email": "doctor@healthcore.com", "password": "securePass1"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        # Cookie should be set
        set_cookie = response.headers.get("set-cookie", "")
        assert "access_token=" in set_cookie
        assert "HttpOnly" in set_cookie


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------


class TestLoginEdge:
    def test_empty_password_field(self, client: TestClient):
        """A blank string for password reaches the router → user lookup
        fails (no user with that + blank combo) → 401."""
        response = client.post(
            ENDPOINT,
            json={"email": "doctor@healthcore.com", "password": ""},
        )
        # The app's validation_exception_handler converts Pydantic errors
        # to 400, but an empty string *is* a valid string for Pydantic,
        # so the request reaches the route handler → 401
        assert response.status_code in (400, 401)

    def test_invalid_email_format(self, client: TestClient):
        """An email-like field that doesn't validate as EmailStr → 400
        (the app's validation_exception_handler converts Pydantic errors)."""
        response = client.post(
            ENDPOINT,
            json={"email": "not-an-email", "password": "securePass1"},
        )
        assert response.status_code == 400


# ---------------------------------------------------------------------------
# Failure modes
# ---------------------------------------------------------------------------


class TestLoginFailure:
    def test_unregistered_email(self, client: TestClient):
        """A non-existent email must return 401 with a generic message
        (no user enumeration)."""
        response = client.post(
            ENDPOINT,
            json={"email": "nobody@example.com", "password": "securePass1"},
        )
        assert response.status_code == 401
        assert "Invalid email or password" in response.json()["detail"]

    def test_wrong_password(self, client: TestClient, sample_user):
        """Wrong password for an existing user → same generic 401 message."""
        response = client.post(
            ENDPOINT,
            json={"email": "doctor@healthcore.com", "password": "wrongPassword1"},
        )
        assert response.status_code == 401
        assert "Invalid email or password" in response.json()["detail"]

    def test_inactive_account(self, client: TestClient, inactive_user):
        """A deactivated user must receive a distinct 401 message."""
        response = client.post(
            ENDPOINT,
            json={"email": "inactive@healthcore.com", "password": "securePass1"},
        )
        assert response.status_code == 401
        assert "Account is deactivated" in response.json()["detail"]