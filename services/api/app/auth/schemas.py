"""
HealthCore — Auth Schemas
==========================
Pydantic models for authentication endpoints (login, token, /auth/me).
"""

from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.users.schemas import UserRole


# ── Password Reset Schemas ─────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    """Request body for POST /auth/forgot-password."""

    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Request body for POST /auth/reset-password."""

    token: str
    new_password: str = Field(..., min_length=6, description="Minimum 6 characters")


class ChangePasswordRequest(BaseModel):
    """Request body for POST /auth/change-password (authenticated)."""

    current_password: str
    new_password: str = Field(..., min_length=6, description="Minimum 6 characters")


class MessageResponse(BaseModel):
    """Generic message response."""

    message: str


# ── Login Schemas ──────────────────────────────────────────────────

class LoginRequest(BaseModel):
    """Request body for POST /auth/login."""

    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Response body returned on successful login."""

    access_token: str
    token_type: str = "bearer"


class ProfilePublic(BaseModel):
    """Minimal profile data exposed in /auth/me."""

    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None


class AuthMeResponse(BaseModel):
    """
    Response for GET /auth/me.

    Includes user credentials (email, role) plus the linked profile.
    """

    email: str
    role: UserRole
    profile: ProfilePublic