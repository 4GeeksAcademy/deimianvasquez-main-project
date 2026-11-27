"""
Unit tests for the auth service and repository logic.

These tests exercise the functions in ``app.auth.service`` and
``app.auth.repository`` directly, without HTTP.

Coverage includes:
- Token generation (claims, expiry, purpose).
- Token decoding (valid, expired, wrong purpose, missing sub).
- Password reset flow (request + complete).
- Change password flow.
- Repository operations (insert, lookup, mark used, hash storage, cleanup).
"""

from datetime import datetime, timezone
from hashlib import sha256
from unittest.mock import ANY

import pytest

from app.auth.repository import (
    RESET_TOKENS_TABLE,
    delete_expired_tokens,
    get_token_record,
    insert_token,
    mark_token_used,
)
from app.auth.service import (
    _decode_reset_token,
    _generate_reset_token,
    PasswordValidationError,
    change_user_password,
    complete_password_reset,
    request_password_reset,
)
from app.core.security import hash_password, verify_password


# ======================================================================
# _generate_reset_token & _decode_reset_token
# ======================================================================


class TestResetTokenGeneration:
    def test_generates_valid_token_with_correct_claims(self, sample_user):
        """The generated JWT must have the proper sub, purpose, exp, and iat."""
        token, expires_at = _generate_reset_token(sample_user["id"])
        assert isinstance(token, str) and len(token) > 20
        assert isinstance(expires_at, str)  # ISO datetime string

        # Decode and verify
        user_id = _decode_reset_token(token)
        assert user_id == sample_user["id"]

    def test_rejects_expired_token(self):
        """Manually crafted expired token must return None."""
        import jwt

        from app.core.config import PASSWORD_RESET_TOKEN_SECRET_KEY, JWT_ALGORITHM

        now = datetime.now(timezone.utc)
        payload = {
            "sub": "1",
            "exp": now,  # expired exactly now (already past)
            "iat": now,
            "purpose": "password_reset",
        }
        # Need to subtract a tiny bit so it's truly expired
        payload["exp"] = now.replace(year=now.year - 1)
        token = jwt.encode(payload, PASSWORD_RESET_TOKEN_SECRET_KEY, algorithm=JWT_ALGORITHM)

        assert _decode_reset_token(token) is None

    def test_rejects_wrong_purpose(self):
        """A JWT with purpose != 'password_reset' must return None."""
        import jwt

        from app.core.config import PASSWORD_RESET_TOKEN_SECRET_KEY, JWT_ALGORITHM

        now = datetime.now(timezone.utc)
        payload = {
            "sub": "1",
            "exp": now.replace(year=now.year + 1),
            "iat": now,
            "purpose": "access",
        }
        token = jwt.encode(payload, PASSWORD_RESET_TOKEN_SECRET_KEY, algorithm=JWT_ALGORITHM)
        assert _decode_reset_token(token) is None

    def test_rejects_missing_sub(self):
        """A JWT without a 'sub' claim must return None."""
        import jwt

        from app.core.config import PASSWORD_RESET_TOKEN_SECRET_KEY, JWT_ALGORITHM

        now = datetime.now(timezone.utc)
        payload = {
            "exp": now.replace(year=now.year + 1),
            "iat": now,
            "purpose": "password_reset",
        }
        token = jwt.encode(payload, PASSWORD_RESET_TOKEN_SECRET_KEY, algorithm=JWT_ALGORITHM)
        assert _decode_reset_token(token) is None

    def test_rejects_malformed_token(self):
        """A random string must return None."""
        assert _decode_reset_token("not-a-token") is None


# ======================================================================
# Repository
# ======================================================================


class TestRepository:
    def test_insert_and_get_token(self, reset_tokens_table, sample_user):
        """A token is stored as SHA-256 and can be retrieved by its raw value."""
        raw = "my-raw-token-value"
        doc_id = insert_token(sample_user["id"], raw, "2027-01-01T00:00:00+00:00")
        assert isinstance(doc_id, int)

        record = get_token_record(raw)
        assert record is not None
        assert record["user_id"] == sample_user["id"]
        assert record["token_hash"] == sha256(raw.encode()).hexdigest()
        assert record["used"] is False

    def test_get_nonexistent_token_returns_none(self):
        """A token that was never stored must return None."""
        assert get_token_record("ghost-token") is None

    def test_mark_token_used(self, reset_tokens_table, sample_user):
        """After marking a token as used, its record must reflect that."""
        raw = "token-to-use"
        insert_token(sample_user["id"], raw, "2027-01-01T00:00:00+00:00")

        result = mark_token_used(raw)
        assert result is True

        record = get_token_record(raw)
        assert record["used"] is True

    def test_mark_nonexistent_token_returns_false(self):
        """mark_token_used on a token that doesn't exist must return False."""
        assert mark_token_used("nonexistent") is False

    def test_delete_expired_tokens(self, reset_tokens_table):
        """Only tokens with expires_at in the past should be removed."""
        from app.auth.repository import insert_token

        past = "2020-01-01T00:00:00+00:00"
        future = "2030-01-01T00:00:00+00:00"
        insert_token(1, "past-token", past)
        insert_token(2, "future-token", future)

        deleted = delete_expired_tokens()
        assert deleted >= 1

        assert get_token_record("past-token") is None
        assert get_token_record("future-token") is not None


# ======================================================================
# request_password_reset
# ======================================================================


class TestRequestPasswordReset:
    def test_registered_email_triggers_token_and_email(
        self, sample_user, reset_tokens_table, monkeypatch
    ):
        """For a known email, a token must be stored and email sent."""
        sent = []

        monkeypatch.setattr(
            "app.auth.service.send_reset_email",
            lambda email, token, expire: sent.append((email, token, expire)),
        )

        result = request_password_reset("doctor@healthcore.com")
        assert result is True
        assert len(sent) == 1
        assert sent[0][0] == "doctor@healthcore.com"

        # A token record must exist
        assert len(reset_tokens_table) >= 1

    def test_unregistered_email_returns_true_no_email(
        self, monkeypatch
    ):
        """An unknown email must return True without sending anything
        (prevents user enumeration)."""
        sent = []

        monkeypatch.setattr(
            "app.auth.service.send_reset_email",
            lambda email, token, expire: sent.append((email, token, expire)),
        )

        result = request_password_reset("unknown@example.com")
        assert result is True
        assert len(sent) == 0


# ======================================================================
# complete_password_reset
# ======================================================================


class TestCompletePasswordReset:
    def test_completes_reset_with_valid_token(
        self, sample_user, reset_token: str
    ):
        """A valid, unused token must change the password and invalidate itself."""
        new_pw = "newPassword1"
        old_hash = sample_user["hashed_password"]

        complete_password_reset(reset_token, new_pw)

        from app.users.repository import get_by_id

        updated = get_by_id(sample_user["id"])
        assert updated["hashed_password"] != old_hash
        assert verify_password(new_pw, updated["hashed_password"])

        # Token must be marked used
        from app.auth.repository import get_token_record

        record = get_token_record(reset_token)
        assert record["used"] is True

    def test_raises_on_already_used_token(self, sample_user, used_reset_token: str):
        """Using a token that was already consumed must raise."""
        with pytest.raises(PasswordValidationError, match="already been used"):
            complete_password_reset(used_reset_token, "newPassword1")

    def test_raises_on_orphan_token(self, sample_user):
        """A valid JWT without a DB record must raise (replay scenario)."""
        from app.auth.service import _generate_reset_token

        token, _ = _generate_reset_token(sample_user["id"])
        # Do NOT insert into DB
        with pytest.raises(PasswordValidationError, match="invalid or has expired"):
            complete_password_reset(token, "newPassword1")


# ======================================================================
# change_user_password
# ======================================================================


class TestChangeUserPassword:
    def test_changes_password_with_valid_current(self, sample_user):
        """With the correct current password, the hash must change."""
        new_pw = "newPassword1"
        old_hash = sample_user["hashed_password"]

        change_user_password(sample_user["id"], "securePass1", new_pw)

        from app.users.repository import get_by_id

        updated = get_by_id(sample_user["id"])
        assert updated["hashed_password"] != old_hash
        assert verify_password(new_pw, updated["hashed_password"])

    def test_raises_on_wrong_current_password(self, sample_user):
        """An incorrect current_password must raise."""
        with pytest.raises(PasswordValidationError, match="Current password is incorrect"):
            change_user_password(sample_user["id"], "wrongPassword", "newPassword1")

    def test_raises_on_deleted_user(self):
        """A user ID that doesn't exist must raise."""
        with pytest.raises(PasswordValidationError, match="not found"):
            change_user_password(99999, "anything", "newPassword1")