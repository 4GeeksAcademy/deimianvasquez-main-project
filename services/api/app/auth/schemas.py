"""
HealthCore — Auth Schemas
==========================
Pydantic models for authentication endpoints (login, token, /auth/me).
"""

from typing import Optional

from pydantic import BaseModel, EmailStr

from app.users.schemas import UserRole


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