"""
HealthCore — Auth Service
===========================
Business logic for password reset and change workflows.

Sits between the router (HTTP layer), the repository (data access),
the email service (Resend), and the user service.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt

from app.auth.email_service import send_reset_email
from app.auth.repository import (
    delete_expired_tokens,
    get_token_record,
    insert_token,
    mark_token_used,
)
from app.core.config import (
    JWT_ALGORITHM,
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES,
    PASSWORD_RESET_TOKEN_SECRET_KEY,
)
from app.core.security import hash_password, verify_password
from app.users.repository import get_by_email, update as update_user_in_db
from app.users.schemas import UserInDB, UserRole
from app.users.service import get_user_by_email


def _generate_reset_token(user_id: int) -> tuple[str, str]:
    """
    Generate a JWT reset token and its ISO expiry datetime.

    The token is signed with ``PASSWORD_RESET_TOKEN_SECRET_KEY`` and
    includes:
    - ``sub``: user ID (as string).
    - ``exp``: expiration timestamp (UTC).
    - ``iat``: issued-at timestamp (UTC).
    - ``purpose``: ``"password_reset"`` to prevent reuse as access token.

    Args:
        user_id: The TinyDB doc_id of the user.

    Returns:
        Tuple of (raw JWT token string, ISO expiry datetime string).
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=PASSWORD_RESET_TOKEN_EXPIRE_MINUTES)

    payload = {
        "sub": str(user_id),
        "exp": expire,
        "iat": now,
        "purpose": "password_reset",
    }
    token = jwt.encode(payload, PASSWORD_RESET_TOKEN_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return token, expire.isoformat()


def _decode_reset_token(token: str) -> Optional[int]:
    """
    Decode and validate a password reset JWT.

    Checks:
    - Valid JWT signature and expiry (via PyJWT).
    - ``purpose`` claim is ``"password_reset"``.

    Args:
        token: The raw JWT reset token.

    Returns:
        The user ID (int) if valid, None otherwise.
    """
    try:
        payload = jwt.decode(
            token,
            PASSWORD_RESET_TOKEN_SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
        )
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None

    # Verify purpose
    if payload.get("purpose") != "password_reset":
        return None

    # Extract user ID
    user_id_str = payload.get("sub")
    if user_id_str is None:
        return None

    try:
        return int(user_id_str)
    except (ValueError, TypeError):
        return None


# ── Public API ─────────────────────────────────────────────────────

def request_password_reset(email: str) -> bool:
    """
    Initiate a password reset flow for the given email.

    Always returns True to prevent user enumeration. If the email
    exists, a reset token is generated, stored (hashed) in the
    database, and an email is sent.

    Args:
        email: The user's email address.

    Returns:
        Always True.
    """
    # Clean up expired tokens opportunistically
    delete_expired_tokens()

    # Look up user — don't reveal whether the email exists
    user = get_user_by_email(email)
    if user is None:
        return True  # Silent success — no email sent

    # Generate and store the reset token
    raw_token, expires_at = _generate_reset_token(user.id)
    insert_token(user.id, raw_token, expires_at)

    # Send the email (fire-and-forget)
    send_reset_email(email, raw_token, PASSWORD_RESET_TOKEN_EXPIRE_MINUTES)

    return True


def complete_password_reset(token: str, new_password: str) -> None:
    """
    Complete a password reset: validate token, update password, invalidate token.

    Args:
        token: The raw JWT reset token.
        new_password: The new plaintext password.

    Raises:
        ValueError: If the token is invalid, expired, or already used.
    """
    # 1. Decode and validate JWT
    user_id = _decode_reset_token(token)
    if user_id is None:
        raise ValueError("The reset link is invalid or has expired. Please request a new one.")

    # 2. Check the token record in DB (prevents replay)
    record = get_token_record(token)
    if record is None:
        raise ValueError("The reset link is invalid or has expired. Please request a new one.")

    if record.get("used", False):
        raise ValueError("This reset link has already been used. Please request a new one.")

    # 3. Hash the new password and update the user
    hashed_pw = hash_password(new_password)
    update_user_in_db(user_id, {"hashed_password": hashed_pw})

    # 4. Invalidate the token
    mark_token_used(token)


def change_user_password(
    user_id: int,
    current_password: str,
    new_password: str,
) -> None:
    """
    Change the password for an authenticated user.

    Args:
        user_id: The TinyDB doc_id of the authenticated user.
        current_password: The user's current plaintext password.
        new_password: The desired new plaintext password.

    Raises:
        ValueError: If ``current_password`` is incorrect.
    """
    # Fetch the user (includes hashed_password)
    from app.users.repository import get_by_id

    user_doc = get_by_id(user_id)
    if user_doc is None:
        raise ValueError("User not found.")

    # Verify current password
    if not verify_password(current_password, user_doc.get("hashed_password", "")):
        raise ValueError("Current password is incorrect.")

    # Hash and update
    hashed_pw = hash_password(new_password)
    update_user_in_db(user_id, {"hashed_password": hashed_pw})