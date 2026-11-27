"""
Shared fixtures for the auth test suite.

All tests use a temporary TinyDB database to avoid touching the real
``services/api/data/db.json`` file. The email service is mocked so no
real Resend calls are made.
"""

from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Generator

import jwt
import pytest
from fastapi.testclient import TestClient
from tinydb import TinyDB
from tinydb.table import Table

import app.db.tinydb_conn as tinydb_conn_module
from app.core.config import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    JWT_ALGORITHM,
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES,
    PASSWORD_RESET_TOKEN_SECRET_KEY,
    SECRET_KEY,
)
from app.core.security import hash_password
from app.db.tinydb_conn import get_db
from app.main import app
from app.users.schemas import UserRole

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _create_user_dict(
    email: str = "doctor@healthcore.com",
    role: UserRole = UserRole.USER,
    is_active: bool = True,
) -> dict[str, Any]:
    return {
        "email": email,
        "hashed_password": hash_password("securePass1"),
        "role": role.value,
        "is_active": is_active,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


def _make_access_token(user_id: int, secret: str = SECRET_KEY) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "exp": now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
        "iat": now,
    }
    return jwt.encode(payload, secret, algorithm=JWT_ALGORITHM)


def _make_reset_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "exp": now + timedelta(minutes=PASSWORD_RESET_TOKEN_EXPIRE_MINUTES),
        "iat": now,
        "purpose": "password_reset",
    }
    return jwt.encode(
        payload, PASSWORD_RESET_TOKEN_SECRET_KEY, algorithm=JWT_ALGORITHM
    )


# ---------------------------------------------------------------------------
# Module-level: point the TinyDB singleton to a temp file
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def _tmp_db(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> Generator[TinyDB, None, None]:
    """
    Point EVERY module that calls ``get_db()`` to a temporary TinyDB.

    This is needed because several repository modules capture their table
    reference at import time (e.g. ``RESET_TOKENS_TABLE = get_db().table(…)``).
    We monkey-patch:
    1. ``tinydb_conn.get_db`` so future calls return the temp DB.
    2. The *already-imported* table references in auth, users, profiles,
       incidents, and suppliers repositories so they point to tables in the
       temp DB.
    """
    db_path = tmp_path / "test_db.json"
    tmp = TinyDB(str(db_path))

    # 1. Patch get_db itself
    monkeypatch.setattr(tinydb_conn_module, "get_db", lambda: tmp)

    # 2. Re-point module-level table references that were captured at import time
    import app.auth.repository as auth_repo
    import app.users.repository as users_repo
    import app.profiles.repository as profiles_repo

    reset_tab: Table = tmp.table("reset_tokens")
    users_tab: Table = tmp.table("users")
    profiles_tab: Table = tmp.table("profiles")

    monkeypatch.setattr(auth_repo, "RESET_TOKENS_TABLE", reset_tab)
    monkeypatch.setattr(users_repo, "USERS_TABLE", users_tab)
    monkeypatch.setattr(profiles_repo, "PROFILES_TABLE", profiles_tab)

    yield tmp
    tmp.close()


# ---------------------------------------------------------------------------
# User fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def users_table(_tmp_db: TinyDB):
    """Return the ``users`` table from the temp DB."""
    return _tmp_db.table("users")


@pytest.fixture
def reset_tokens_table(_tmp_db: TinyDB):
    """Return the ``reset_tokens`` table from the temp DB."""
    return _tmp_db.table("reset_tokens")


@pytest.fixture
def sample_user(users_table) -> dict[str, Any]:
    """A plain active user inserted in the temp DB."""
    doc_id = users_table.insert(_create_user_dict())
    doc = users_table.get(doc_id=doc_id)
    doc["id"] = doc_id
    return doc


@pytest.fixture
def sample_admin(users_table) -> dict[str, Any]:
    """An active admin user."""
    doc_id = users_table.insert(_create_user_dict(email="admin@healthcore.com", role=UserRole.ADMIN))
    doc = users_table.get(doc_id=doc_id)
    doc["id"] = doc_id
    return doc


@pytest.fixture
def inactive_user(users_table) -> dict[str, Any]:
    """A user with ``is_active=False``."""
    doc_id = users_table.insert(
        _create_user_dict(email="inactive@healthcore.com", is_active=False)
    )
    doc = users_table.get(doc_id=doc_id)
    doc["id"] = doc_id
    return doc


# ---------------------------------------------------------------------------
# Token fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def user_token(sample_user) -> str:
    """A valid JWT for the sample user."""
    return _make_access_token(sample_user["id"])


@pytest.fixture
def expired_token() -> str:
    """A JWT that is already expired."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": "1",
        "exp": now - timedelta(hours=1),
        "iat": now - timedelta(hours=2),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=JWT_ALGORITHM)


@pytest.fixture
def wrong_secret_token() -> str:
    """A JWT signed with a different secret key."""
    return _make_access_token(1, secret="wrong-secret")


@pytest.fixture
def reset_token(sample_user, reset_tokens_table) -> str:
    """
    A valid reset token with its record in the temp DB.

    Returns the raw JWT so tests can POST it.
    """
    raw = _make_reset_token(sample_user["id"])
    from hashlib import sha256

    reset_tokens_table.insert(
        {
            "user_id": sample_user["id"],
            "token_hash": sha256(raw.encode()).hexdigest(),
            "expires_at": (
                datetime.now(timezone.utc)
                + timedelta(minutes=PASSWORD_RESET_TOKEN_EXPIRE_MINUTES)
            ).isoformat(),
            "used": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    return raw


@pytest.fixture
def used_reset_token(sample_user, reset_tokens_table) -> str:
    """A reset token already marked as used."""
    raw = _make_reset_token(sample_user["id"])
    from hashlib import sha256

    reset_tokens_table.insert(
        {
            "user_id": sample_user["id"],
            "token_hash": sha256(raw.encode()).hexdigest(),
            "expires_at": (
                datetime.now(timezone.utc)
                + timedelta(minutes=PASSWORD_RESET_TOKEN_EXPIRE_MINUTES)
            ).isoformat(),
            "used": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    return raw


# ---------------------------------------------------------------------------
# Auth headers
# ---------------------------------------------------------------------------


@pytest.fixture
def auth_headers(user_token: str) -> dict[str, str]:
    """Authorization: Bearer header dict."""
    return {"Authorization": f"Bearer {user_token}"}


# ---------------------------------------------------------------------------
# Test client
# ---------------------------------------------------------------------------


@pytest.fixture
def client() -> TestClient:
    """FastAPI TestClient bound to the app."""
    return TestClient(app)


# ---------------------------------------------------------------------------
# Mock email service
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def _mock_email(monkeypatch: pytest.MonkeyPatch):
    """
    Prevent any real Resend call during tests.

    The mock returns True so the service behaves as if the email was sent.
    """
    monkeypatch.setattr("app.auth.service.send_reset_email", lambda *a, **kw: True)