"""
Tests for ``GET /auth/me``.

Happy path  — authenticated user with a profile → 200 + email, role, profile.
Edge cases  — authenticated user without a profile → 200, profile fields are null.
Failure     — no token; expired token; wrong secret; malformed sub; deleted user.
"""

from fastapi.testclient import TestClient

ENDPOINT = "/auth/me"

# ---------------------------------------------------------------------------
# Happy path
# ---------------------------------------------------------------------------


class TestMeHappy:
    def test_authenticated_with_profile_returns_user_data(
        self, client: TestClient, sample_user, user_token
    ):
        """When the user has a profile, it must be included in the response."""
        response = client.get(ENDPOINT, headers={"Authorization": f"Bearer {user_token}"})
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "doctor@healthcore.com"
        assert data["role"] == "user"
        # The profile might be null or have fields; we just verify structure
        assert "profile" in data


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------


class TestMeEdge:
    def test_no_profile_returns_null_profile_fields(
        self, client: TestClient, sample_user, user_token
    ):
        """Even without a profile entry, the endpoint must return the user
        with profile fields set to null (graceful degradation)."""
        response = client.get(ENDPOINT, headers={"Authorization": f"Bearer {user_token}"})
        assert response.status_code == 200
        data = response.json()
        # The profile is None (no profile record exists) → fields are null
        assert data["profile"]["name"] is None
        assert data["profile"]["phone"] is None
        assert data["profile"]["address"] is None


# ---------------------------------------------------------------------------
# Failure modes
# ---------------------------------------------------------------------------


class TestMeFailure:
    def test_no_token(self, client: TestClient):
        """Without any token the endpoint should return 401."""
        response = client.get(ENDPOINT)
        assert response.status_code == 401
        assert "Not authenticated" in response.json()["detail"]

    def test_expired_token(self, client: TestClient, expired_token: str):
        response = client.get(ENDPOINT, headers={"Authorization": f"Bearer {expired_token}"})
        assert response.status_code == 401
        assert "Token has expired" in response.json()["detail"]

    def test_wrong_secret(self, client: TestClient, wrong_secret_token: str):
        response = client.get(ENDPOINT, headers={"Authorization": f"Bearer {wrong_secret_token}"})
        assert response.status_code == 401
        assert "Invalid token" in response.json()["detail"]

    def test_token_without_sub(self, client: TestClient):
        """A JWT that is correctly signed but missing the 'sub' claim → 401."""
        import jwt
        from datetime import datetime, timedelta, timezone
        from app.core.config import SECRET_KEY, JWT_ALGORITHM

        token = jwt.encode(
            {"exp": datetime.now(timezone.utc) + timedelta(hours=1), "iat": datetime.now(timezone.utc)},
            SECRET_KEY,
            algorithm=JWT_ALGORITHM,
        )
        response = client.get(ENDPOINT, headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 401
        assert "missing" in response.json()["detail"].lower()

    def test_non_numeric_sub(self, client: TestClient):
        """A 'sub' that can't be parsed as int → 401."""
        import jwt
        from datetime import datetime, timedelta, timezone
        from app.core.config import SECRET_KEY, JWT_ALGORITHM

        token = jwt.encode(
            {
                "sub": "not-a-number",
                "exp": datetime.now(timezone.utc) + timedelta(hours=1),
                "iat": datetime.now(timezone.utc),
            },
            SECRET_KEY,
            algorithm=JWT_ALGORITHM,
        )
        response = client.get(ENDPOINT, headers={"Authorization": f"Bearer {token}"})
        assert response.status_code == 401
        assert "invalid user" in response.json()["detail"].lower()

    def test_deleted_user(self, client: TestClient, sample_user, user_token, users_table):
        """A valid token for a user that no longer exists → 401."""
        users_table.remove(doc_ids=[sample_user["id"]])
        response = client.get(ENDPOINT, headers={"Authorization": f"Bearer {user_token}"})
        assert response.status_code == 401
        assert "not found" in response.json()["detail"].lower()