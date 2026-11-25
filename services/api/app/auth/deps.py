"""
HealthCore — Auth Dependencies
===============================
Reusable FastAPI dependency ``get_current_user``.

Extracts the JWT token from:
1. The HttpOnly cookie ``access_token`` (primary).
2. The ``Authorization: Bearer <token>`` header (fallback, for Swagger UI).

Decodes the token, looks up the user in TinyDB, and returns the user.
Raises ``HTTPException(401)`` if the token is missing, invalid, or expired.
"""

from typing import Optional

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer

from app.core.config import COOKIE_NAME
from app.core.security import decode_access_token
from app.users.repository import get_by_id
from app.users.schemas import UserInDB, UserRole

# OAuth2 scheme — tells FastAPI where the token comes from in Swagger UI
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


async def get_current_user(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
) -> UserInDB:
    """
    FastAPI dependency that authenticates the current user.

    Resolution order:
    1. ``access_token`` HttpOnly cookie (most secure for browser clients).
    2. ``Authorization: Bearer <token>`` header (for Swagger UI / API clients).

    Args:
        request: The incoming HTTP request (used to read cookies).
        token: The Bearer token from the Authorization header (if any).

    Returns:
        The authenticated ``UserInDB`` (includes hashed_password, but only
        used internally — never returned to the client).

    Raises:
        HTTPException(401): If no valid token is provided.
    """
    # ── Step 1: Try HttpOnly cookie first ─────────────────────
    raw_token: Optional[str] = request.cookies.get(COOKIE_NAME)

    # ── Step 2: Fall back to Bearer header ────────────────────
    if raw_token is None:
        raw_token = token

    # ── Step 3: No token at all → 401 ─────────────────────────
    if raw_token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Provide a valid token via cookie or Authorization header.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # ── Step 4: Decode and validate ───────────────────────────
    try:
        payload = decode_access_token(raw_token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token. The token could not be validated.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # ── Step 5: Extract user ID ───────────────────────────────
    user_id_str: Optional[str] = payload.get("sub")
    if user_id_str is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is missing the user ID ('sub' claim).",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = int(user_id_str)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token contains an invalid user ID.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # ── Step 6: Look up user in TinyDB ───────────────────────
    user_doc = get_by_id(user_id)
    if user_doc is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found. The account may have been deleted.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return UserInDB(
        id=user_doc.doc_id,
        email=user_doc["email"],
        role=UserRole(user_doc["role"]),
        is_active=user_doc.get("is_active", True),
        created_at=user_doc.get("created_at", ""),
        hashed_password=user_doc["hashed_password"],
    )