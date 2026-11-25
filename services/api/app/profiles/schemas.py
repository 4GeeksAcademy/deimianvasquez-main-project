"""
HealthCore — Profiles Schemas
==============================
Pydantic models for Profile CRUD operations.

``Profile`` holds the user's visible name and contact data.
Linked 1:1 to ``User`` via ``user_id``.
"""

from typing import Optional

from pydantic import BaseModel, Field


# ── Request schemas ────────────────────────────────────────────────

class ProfileCreate(BaseModel):
    """Schema for creating a profile (usually called from User service)."""

    user_id: int
    name: Optional[str] = Field(default=None, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=30)
    address: Optional[str] = Field(default=None, max_length=255)


class ProfileUpdate(BaseModel):
    """Schema for updating the authenticated user's profile."""

    name: Optional[str] = Field(default=None, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=30)
    address: Optional[str] = Field(default=None, max_length=255)


# ── Response schemas ───────────────────────────────────────────────

class ProfileResponse(BaseModel):
    """Schema returned by the API for profile data."""

    id: int
    user_id: int
    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None