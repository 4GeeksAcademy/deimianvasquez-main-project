"""
HealthCore — Auth Router
==========================
Authentication endpoints.

Routes:
- ``POST /auth/login``  — Authenticate and receive a JWT.
- ``GET /auth/me``      — Get current user's email, role, and profile.
"""

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.auth.deps import get_current_user
from app.auth.schemas import AuthMeResponse, LoginRequest, ProfilePublic, TokenResponse
from app.core.security import (
    build_set_cookie_header,
    create_access_token,
    verify_password,
)
from app.profiles.service import get_profile
from app.users.schemas import UserCreate
from app.users.service import get_user_by_email

router = APIRouter(tags=["Auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, response: Response):
    """
    Authenticate with email and password.

    On success:
    - Returns a JSON body with ``access_token`` and ``token_type``.
    - Sets an **HttpOnly** cookie named ``access_token`` for browser clients.
    - The cookie is Secure, SameSite=Lax, and JS-cannot-read.

    On failure: returns ``401 Unauthorized``.
    """
    # ── Look up user by email ──────────────────────────────────
    user = get_user_by_email(payload.email)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # ── Verify password ───────────────────────────────────────
    if not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # ── Check user is active ──────────────────────────────────
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is deactivated. Contact an administrator.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # ── Create JWT ────────────────────────────────────────────
    access_token = create_access_token(data={"sub": str(user.id)})

    # ── Set HttpOnly cookie ───────────────────────────────────
    cookie_headers = build_set_cookie_header(access_token)
    for header_name, header_value in cookie_headers.items():
        response.headers[header_name] = header_value

    return TokenResponse(access_token=access_token)


@router.get("/me", response_model=AuthMeResponse)
def auth_me(current_user: UserCreate = Depends(get_current_user)):
    """
    Get the currently authenticated user's info (protected).

    Returns:
    - ``email`` — the user's email.
    - ``role`` — the user's role (admin, manager, user).
    - ``profile`` — the linked profile (name, phone, address).
    """
    profile = get_profile(current_user.id)
    profile_public = ProfilePublic(
        name=profile.name if profile else None,
        phone=profile.phone if profile else None,
        address=profile.address if profile else None,
    )

    return AuthMeResponse(
        email=current_user.email,
        role=current_user.role,
        profile=profile_public,
    )