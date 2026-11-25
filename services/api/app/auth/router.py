"""
HealthCore — Auth Router
==========================
Authentication endpoints.

Routes:
- ``POST /auth/login``              — Authenticate and receive a JWT.
- ``GET /auth/me``                  — Get current user's email, role, and profile.
- ``POST /auth/forgot-password``    — Request a password reset email.
- ``POST /auth/reset-password``     — Reset password with a token.
- ``POST /auth/change-password``    — Change password (authenticated).
"""

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.auth.deps import get_current_user
from app.auth.schemas import (
    AuthMeResponse,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    ProfilePublic,
    ResetPasswordRequest,
    TokenResponse,
)
from app.auth.service import (
    change_user_password,
    complete_password_reset,
    request_password_reset,
)
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


# ── Password Reset ─────────────────────────────────────────────────


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(payload: ForgotPasswordRequest):
    """
    Request a password reset email.

    Always returns ``200`` with a generic success message to prevent
    user enumeration. If the email is registered, a reset link is sent.

    **Security notes:**
    - Always returns the same response regardless of whether the email exists.
    - The reset token expires in 15 minutes (configurable).
    - The token can only be used once.
    """
    request_password_reset(payload.email)

    return MessageResponse(
        message="If that email address is registered, you will receive a password reset link shortly."
    )


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(payload: ResetPasswordRequest):
    """
    Reset the password using a valid reset token.

    The token must:
    - Have a valid JWT signature.
    - Not be expired.
    - Not have been used already.

    On success, the token is invalidated and cannot be reused.
    """
    try:
        complete_password_reset(payload.token, payload.new_password)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return MessageResponse(
        message="Your password has been reset successfully. You can now log in with your new password."
    )


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    payload: ChangePasswordRequest,
    current_user: UserCreate = Depends(get_current_user),
):
    """
    Change the password for the currently authenticated user.

    Requires a valid session token (cookie or Authorization header).

    Returns ``400`` if the current password is incorrect.
    """
    try:
        change_user_password(current_user.id, payload.current_password, payload.new_password)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return MessageResponse(message="Your password has been changed successfully.")