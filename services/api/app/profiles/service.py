"""
HealthCore — Profiles Service
===============================
Business logic for profile management.

Handles retrieval and update of the authenticated user's profile.
"""

from typing import Optional

from app.profiles.repository import (
    get_by_user_id as get_profile_by_user_id,
    update_by_user_id as update_profile_by_user_id,
)
from app.profiles.schemas import ProfileResponse, ProfileUpdate


def _doc_to_response(doc: dict) -> ProfileResponse:
    """Convert a TinyDB profile dict to a ProfileResponse."""
    return ProfileResponse(
        id=doc.doc_id,
        user_id=doc["user_id"],
        name=doc.get("name"),
        phone=doc.get("phone"),
        address=doc.get("address"),
    )


def get_profile(user_id: int) -> Optional[ProfileResponse]:
    """
    Retrieve the profile linked to a user.

    Args:
        user_id: The TinyDB doc_id of the user.

    Returns:
        ProfileResponse or None if not found.
    """
    doc = get_profile_by_user_id(user_id)
    if doc is None:
        return None
    return _doc_to_response(doc)


def update_profile(user_id: int, data: ProfileUpdate) -> Optional[ProfileResponse]:
    """
    Update the profile linked to a user.

    Only the owner of the profile can update it (enforced by the router layer).

    Args:
        user_id: The TinyDB doc_id of the user.
        data: Fields to update (name, phone, address).

    Returns:
        Updated ProfileResponse or None if profile not found.
    """
    update_data: dict = {}
    if data.name is not None:
        update_data["name"] = data.name
    if data.phone is not None:
        update_data["phone"] = data.phone
    if data.address is not None:
        update_data["address"] = data.address

    if not update_data:
        # Nothing to update, just return current profile
        return get_profile(user_id)

    success = update_profile_by_user_id(user_id, update_data)
    if not success:
        return None

    return get_profile(user_id)