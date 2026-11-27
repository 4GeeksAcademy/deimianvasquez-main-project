"""
Tests for ``POST /auth/reset-password``.

Happy path  — valid token + new password → 200; hash updated; token invalidated.
Edge cases  — password at minimum length (6 chars).
Failure     — malformed token; wrong purpose; expired token; token without DB
              record (replay); token already used; password too short (< 6).
"""

from hashlib import sha256
from datetime import datetime, timedelta, timezone

import jwt
from fastapi.testclient import TestClient

from app.core.config import (
    JWT_ALGORITHM,
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES,
    PASSWORD_RESET_TOKEN_SECRET_KEY,
)
from app.core.security import verify_password

ENDPOINT = "/auth/reset-password"

# ---------------------------------------------------------------------------
# Mock helpers for expiry / purpose
# ---------------------------------------------------------------------------


def _jwt_with_purpose(purpose: str, user_id: int, minutes: int = 15) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "exp": now + timedelta(minutes=minutes),
        "iat": now,
        "purpose": purpose,
    }
    return jwt.encode(payload, PASSWORD_RESET_TOKEN_SECRET_KEY, algorithm=JWT_ALGORITHM)


def _expired_jwt(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "exp": now - timedelta(hours=1),
        "iat": now - timedelta(hours=2),
        "purpose": "password_reset",
    }
    return jwt.encode(payload, PASSWORD_RESET_TOKEN_SECRET_KEY, algorithm=JWT_ALGORITHM)


# ---------------------------------------------------------------------------
# Happy path
# ---------------------------------------------------------------------------


class TestResetPasswordHappy:
    def test_valid_token_updates_password(
        self, client: TestClient, sample_user, reset_token: str
    ):
        """A valid, unused token must update the user's password hash
        and mark the token as used."""
        new_pw = "newSecurePass1"
        old_hash = sample_user["hashed_password"]

        response = client.post(
            ENDPOINT,
            json={"token": reset_token, "new_password": new_pw},
        )
        assert response.status_code == 200
        assert "reset successfully" in response.json()["message"].lower()

        # Verify the hash changed and the new password works
        from app.users.repository import get_by_id

        updated = get_by_id(sample_user["id"])
        assert updated is not None
        assert updated["hashed_password"] != old_hash
        assert verify_password(new_pw, updated["hashed_password"])

    def test_token_marked_as_used(
        self, client: TestClient, sample_user, reset_token: str
    ):
        """After a successful reset the token record must be marked used."""
        from tinydb import Query
        from app.auth.repository import RESET_TOKENS_TABLE

        client.post(
            ENDPOINT,
            json={"token": reset_token, "new_password": "newSecurePass1"},
        )
        TokenQ = Query()
        record = RESET_TOKENS_TABLE.get(
            TokenQ.token_hash == sha256(reset_token.encode()).hexdigest()
        )
        assert record is not None, "Token record should exist after reset"
        assert record["used"] is True


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------


class TestResetPasswordEdge:
    def test_minimum_length_password(self, client: TestClient, sample_user, reset_token: str):
        """A password of exactly 6 characters is the minimum allowed."""
        response = client.post(
            ENDPOINT,
            json={"token": reset_token, "new_password": "123456"},
        )
        assert response.status_code == 200


# ---------------------------------------------------------------------------
# Failure modes
# ---------------------------------------------------------------------------


class TestResetPasswordFailure:
    def test_malformed_token(self, client: TestClient):
        """A completely invalid token string → 400."""
        response = client.post(
            ENDPOINT,
            json={"token": "not-a-valid-jwt", "new_password": "newSecurePass1"},
        )
        assert response.status_code == 400

    def test_wrong_purpose(self, client: TestClient, sample_user):
        """A JWT correctly signed but with a purpose other than password_reset → 400."""
        wrong_token = _jwt_with_purpose("access", sample_user["id"])
        response = client.post(
            ENDPOINT,
            json={"token": wrong_token, "new_password": "newSecurePass1"},
        )
        assert response.status_code == 400

    def test_expired_token(self, client: TestClient, sample_user):
        """An expired JWT → 400."""
        expired = _expired_jwt(sample_user["id"])
        response = client.post(
            ENDPOINT,
            json={"token": expired, "new_password": "newSecurePass1"},
        )
        assert response.status_code == 400

    def test_token_without_db_record(
        self, client: TestClient, sample_user
    ):
        """
        A JWT that is valid and unused but has NO record in the DB must be
        rejected (covers the attack scenario where the token was generated
        by a different process or the DB was wiped).
        """
        # Generate a token but do NOT insert a DB record for it
        orphan_token = _jwt_with_purpose("password_reset", sample_user["id"])
        response = client.post(
            ENDPOINT,
            json={"token": orphan_token, "new_password": "newSecurePass1"},
        )
        assert response.status_code == 400
        assert "invalid or has expired" in response.json()["detail"].lower()

    def test_token_already_used(
        self, client: TestClient, sample_user, used_reset_token: str
    ):
        """
        A JWT that is still valid but was already consumed must be rejected.
        This is the replay-attack scenario identified during test planning.
        """
        response = client.post(
            ENDPOINT,
            json={"token": used_reset_token, "new_password": "newSecurePass1"},
        )
        assert response.status_code == 400
        assert "already been used" in response.json()["detail"].lower()

    def test_password_too_short(self, client: TestClient, reset_token: str):
        """A password shorter than 6 characters should be rejected (400 from validation handler)."""
        response = client.post(
            ENDPOINT,
            json={"token": reset_token, "new_password": "12345"},
        )
        assert response.status_code == 400