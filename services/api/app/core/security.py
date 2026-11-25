"""
HealthCore — Security Utilities
================================
JWT token creation/decoding with PyJWT.
Password hashing/verification with libpass (bcrypt).
Cookie helpers for HttpOnly token delivery.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import jwt
from passlib.hash import bcrypt

from app.core.config import (
    SECRET_KEY,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    JWT_ALGORITHM,
    COOKIE_NAME,
)


# ── Password hashing ───────────────────────────────────────────────

def hash_password(password: str) -> str:
    """
    Hash a plaintext password using bcrypt.

    Args:
        password: Plaintext password.

    Returns:
        Bcrypt hash string suitable for storage.
    """
    return bcrypt.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plaintext password against its bcrypt hash.

    Args:
        plain_password: Plaintext password to check.
        hashed_password: Stored bcrypt hash.

    Returns:
        True if the password matches, False otherwise.
    """
    return bcrypt.verify(plain_password, hashed_password)


# ── JWT tokens ─────────────────────────────────────────────────────

def create_access_token(
    data: dict[str, Any],
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Create a signed JWT access token.

    The token carries:
    - ``sub``: user ID (as string) — the primary claim.
    - ``exp``: expiration timestamp (UTC).
    - ``iat``: issued-at timestamp (UTC).

    Args:
        data: Claims to include in the payload. Must contain ``sub``.
        expires_delta: Custom expiry duration. Falls back to
                       ``ACCESS_TOKEN_EXPIRE_MINUTES`` from config.

    Returns:
        Encoded JWT string.
    """
    to_encode = data.copy()
    now = datetime.now(timezone.utc)

    if expires_delta is not None:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire, "iat": now})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> dict[str, Any]:
    """
    Decode and validate a JWT access token.

    Args:
        token: The raw JWT string.

    Returns:
        Decoded payload as a dict.

    Raises:
        jwt.ExpiredSignatureError: If the token has expired.
        jwt.InvalidTokenError: If the token is malformed or signature
            is invalid.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise
    except jwt.InvalidTokenError:
        raise


# ── Cookie helpers ─────────────────────────────────────────────────

def build_set_cookie_header(token: str) -> dict[str, str]:
    """
    Build the ``Set-Cookie`` headers dict for an HttpOnly token cookie.

    The cookie:
    - Is **HttpOnly** (JavaScript cannot read it).
    - Is **Secure** (only sent over HTTPS — in production).
    - Has **SameSite=Lax** (basic CSRF protection).
    - Has **Path=/** (available to all API routes).
    - Uses the configurable ``COOKIE_NAME`` (default: ``access_token``).

    Args:
        token: The JWT string to place in the cookie.

    Returns:
        A dict of ``Set-Cookie`` headers (compatible with
        ``Response.headers`` or ``JSONResponse``).
    """
    # Construir el valor Set-Cookie manualmente para control fino
    cookie = (
        f"{COOKIE_NAME}={token}; "
        f"Max-Age={ACCESS_TOKEN_EXPIRE_MINUTES * 60}; "
        f"Path=/; "
        f"HttpOnly; "
        f"SameSite=Lax"
    )
    return {"Set-Cookie": cookie}


def build_clear_cookie_header() -> dict[str, str]:
    """
    Build the ``Set-Cookie`` headers dict that clears the token cookie
    (useful for logout).

    Returns:
        A dict with a ``Set-Cookie`` header that expires the cookie
        immediately.
    """
    cookie = (
        f"{COOKIE_NAME}=; "
        f"Max-Age=0; "
        f"Path=/; "
        f"HttpOnly; "
        f"SameSite=Lax"
    )
    return {"Set-Cookie": cookie}