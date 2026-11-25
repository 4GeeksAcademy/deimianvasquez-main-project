"""
HealthCore — Profiles Router
==============================
Endpoints for Profile management.

Routes:
- ``GET /profiles/me``   — Get the profile of the authenticated user.
- ``PUT /profiles/me``   — Update name, phone, address (owner only).
"""

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.deps import get_current_user
from app.profiles.schemas import ProfileResponse, ProfileUpdate
from app.profiles.service import get_profile, update_profile
from app.users.schemas import UserCreate

router = APIRouter(tags=["Profiles"])


@router.get("/me", response_model=ProfileResponse)
def get_my_profile(current_user: UserCreate = Depends(get_current_user)):
    """
    Get the profile of the authenticated user (protected).

    Returns the ``Profile`` linked to the current user's account.
    Raises 404 if no profile exists (should not happen under normal flow).
    """
    profile = get_profile(current_user.id)
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found for the authenticated user.",
        )
    return profile


@router.put("/me", response_model=ProfileResponse)
def update_my_profile(
    payload: ProfileUpdate,
    current_user: UserCreate = Depends(get_current_user),
):
    """
    Update the profile of the authenticated user (protected).

    Only the profile owner can update it (enforced by the dependency).
    Fields are optional — only provided fields are updated.

    Raises 404 if no profile exists.
    """
    updated = update_profile(current_user.id, payload)
    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found for the authenticated user.",
        )
    return updated