"""
HealthCore — Users Schemas
===========================
Pydantic models for User CRUD operations.

``User`` stores only credentials (email + hashed_password) plus role and status.
Profile data (name, phone, address) lives in ``app.profiles.schemas``.
"""

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


# ── Role enum ──────────────────────────────────────────────────────

class UserRole(str, Enum):
    """Valid roles for platform users."""

    ADMIN = "admin"
    MANAGER = "manager"
    USER = "user"


# ── Request schemas ────────────────────────────────────────────────

class UserCreate(BaseModel):
    """
    Schema for creating a new user.

    Accepts credential fields plus optional profile fields.
    A linked Profile is automatically created in the same operation.
    """

    email: EmailStr
    password: str = Field(..., min_length=6, description="Minimum 6 characters")
    role: UserRole = UserRole.USER  # default: regular user

    # Optional profile fields (created together with the user)
    name: Optional[str] = Field(default=None, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=30)
    address: Optional[str] = Field(default=None, max_length=255)


class UserUpdate(BaseModel):
    """
    Schema for updating an existing user.

    All fields are optional — only provided fields are updated.
    Only an admin can change ``role``.
    """

    email: Optional[EmailStr] = None
    password: Optional[str] = Field(default=None, min_length=6)
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


# ── Response schemas ───────────────────────────────────────────────

class UserResponse(BaseModel):
    """
    Schema returned by the API for user data.

    Never includes ``hashed_password``.
    """

    id: int
    email: str
    role: UserRole
    is_active: bool
    created_at: str  # ISO datetime


class UserRegistrationResponse(UserResponse):
    """
    Schema returned after user registration.

    Extends ``UserResponse`` with the optional profile fields that
    were accepted in the ``UserCreate`` request, confirming to the
    client that the profile was created successfully.
    """

    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None


class UserInDB(UserResponse):
    """
    Internal schema that includes the hashed password.

    Used only within service/repository layers. Never returned by endpoints.
    """

    hashed_password: str