"""
Tests for ``POST /auth/change-password``.

Happy path  — authenticated user, correct current password → 200; hash updated.
Edge cases  — new password at minimum length (6 chars).
Failure     — wrong current password; deleted user; unauthenticated request.
"""

from fastapi.testclient import TestClient
from app.core.security import verify_password

ENDPOINT = "/auth/change-password"

# ---------------------------------------------------------------------------
# Happy path
# ---------------------------------------------------------------------------


class TestChangePasswordHappy:
    def test_correct_current_password_updates_hash(
        self, client: TestClient, sample_user, user_token: str
    ):
        """With valid credentials the password hash must change."""
        old_hash = sample_user["hashed_password"]
        response = client.post(
            ENDPOINT,
            headers={"Authorization": f"Bearer {user_token}"},
            json={"current_password": "securePass1", "new_password": "newSecurePass1"},
        )
        assert response.status_code == 200
        assert "changed successfully" in response.json()["message"].lower()

        # Verify the hash is different and the new password works
        from app.users.repository import get_by_id

        updated = get_by_id(sample_user["id"])
        assert updated["hashed_password"] != old_hash
        assert verify_password("newSecurePass1", updated["hashed_password"])


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------


class TestChangePasswordEdge:
    def test_minimum_length_new_password(
        self, client: TestClient, sample_user, user_token: str
    ):
        """A new password of exactly 6 characters is the minimum allowed."""
        response = client.post(
            ENDPOINT,
            headers={"Authorization": f"Bearer {user_token}"},
            json={"current_password": "securePass1", "new_password": "123456"},
        )
        assert response.status_code == 200


# ---------------------------------------------------------------------------
# Failure modes
# ---------------------------------------------------------------------------


class TestChangePasswordFailure:
    def test_wrong_current_password(
        self, client: TestClient, sample_user, user_token: str
    ):
        """An incorrect current_password should return 400."""
        response = client.post(
            ENDPOINT,
            headers={"Authorization": f"Bearer {user_token}"},
            json={"current_password": "wrongPassword", "new_password": "newSecurePass1"},
        )
        assert response.status_code == 400
        assert "Current password is incorrect" in response.json()["detail"]

    def test_deleted_user(
        self, client: TestClient, sample_user, user_token: str
    ):
        """A user that existed when the token was issued but was deleted
        before the request → 401 (get_current_user detects missing user)."""
        from app.users.repository import USERS_TABLE

        USERS_TABLE.remove(doc_ids=[sample_user["id"]])
        response = client.post(
            ENDPOINT,
            headers={"Authorization": f"Bearer {user_token}"},
            json={"current_password": "securePass1", "new_password": "newSecurePass1"},
        )
        assert response.status_code == 401
        assert "not found" in response.json()["detail"].lower()

    def test_unauthenticated_request(self, client: TestClient):
        """Without any token the dependency should return 401."""
        response = client.post(
            ENDPOINT,
            json={"current_password": "securePass1", "new_password": "newSecurePass1"},
        )
        assert response.status_code == 401
        assert "Not authenticated" in response.json()["detail"]