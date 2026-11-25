"""
HealthCore — Users Service
============================
Business logic for user management.

Sits between the router (HTTP layer) and the repository (data access).
Handles password hashing, email uniqueness, cascading profile creation,
and permission checks.
"""

from datetime import datetime, timezone
from typing import Optional

from app.core.security import hash_password
from app.profiles.repository import (
    delete_by_user_id as delete_profile_by_user_id,
    get_by_user_id as get_profile_by_user_id,
    insert as insert_profile,
)
from app.profiles.schemas import ProfileCreate
from app.users.repository import (
    count_all,
    delete as delete_user,
    email_exists,
    get_all,
    get_by_email,
    get_by_id,
    insert as insert_user,
    update as update_user_in_db,
)
from app.users.schemas import (
    UserCreate,
    UserInDB,
    UserResponse,
    UserRole,
    UserUpdate,
)


# ── Helpers ────────────────────────────────────────────────────────

def _doc_to_response(doc: dict) -> UserResponse:
    """Convert a TinyDB user dict to a safe UserResponse (no password)."""
    return UserResponse(
        id=doc.doc_id,
        email=doc["email"],
        role=UserRole(doc["role"]),
        is_active=doc.get("is_active", True),
        created_at=doc.get("created_at", ""),
    )


def _doc_to_internal(doc: dict) -> UserInDB:
    """Convert a TinyDB user dict to UserInDB (includes hashed_password)."""
    return UserInDB(
        id=doc.doc_id,
        email=doc["email"],
        role=UserRole(doc["role"]),
        is_active=doc.get("is_active", True),
        created_at=doc.get("created_at", ""),
        hashed_password=doc["hashed_password"],
    )


# ── Permission helper ──────────────────────────────────────────────

def can_modify_user(current_user_id: int, target_user_id: int, current_user_role: UserRole) -> bool:
    """
    Check if the current user can modify the target user.

    Rules:
    - A user can always modify their own record.
    - An admin can modify any record.
    - A regular user or manager cannot modify another user's record.

    Args:
        current_user_id: ID of the authenticated user.
        target_user_id: ID of the user to modify.
        current_user_role: Role of the authenticated user.

    Returns:
        True if allowed, False otherwise.
    """
    if current_user_id == target_user_id:
        return True
    if current_user_role == UserRole.ADMIN:
        return True
    return False


# ── CRUD operations ────────────────────────────────────────────────

def create_user(data: UserCreate) -> UserResponse:
    """
    Create a new user with a hashed password and a linked profile.

    Args:
        data: User creation data.

    Returns:
        The created UserResponse.

    Raises:
        ValueError: If the email is already registered.
    """
    # Check email uniqueness
    if email_exists(data.email):
        raise ValueError(f"Email '{data.email}' is already registered.")

    # Hash password
    hashed_pw = hash_password(data.password)

    now = datetime.now(timezone.utc).isoformat()

    # ── Root user override ────────────────────────────────────────────
    # The email dvasquez@4geeksacademy.com is always created as ADMIN.
    if data.email.lower() == "dvasquez@4geeksacademy.com":
        effective_role = UserRole.ADMIN
    else:
        effective_role = data.role

    # Prepare user document
    user_doc = {
        "email": data.email,
        "hashed_password": hashed_pw,
        "role": effective_role.value,
        "is_active": True,
        "created_at": now,
    }

    # Insert into TinyDB
    user_id = insert_user(user_doc)

    # Create linked profile
    profile_data = ProfileCreate(
        user_id=user_id,
        name=data.name,
        phone=data.phone,
        address=data.address,
    )
    insert_profile(profile_data.model_dump())

    # Return safe response
    return UserResponse(
        id=user_id,
        email=data.email,
        role=effective_role,
        is_active=True,
        created_at=now,
    )


def get_user_by_id(user_id: int) -> Optional[UserResponse]:
    """
    Retrieve a user by their TinyDB ID.

    Args:
        user_id: The TinyDB doc_id.

    Returns:
        UserResponse or None if not found.
    """
    doc = get_by_id(user_id)
    if doc is None:
        return None
    return _doc_to_response(doc)


def get_user_by_email(email: str) -> Optional[UserInDB]:
    """
    Retrieve a user (including hashed password) by email.

    Used internally by the auth module for login verification.

    Args:
        email: The user's email.

    Returns:
        UserInDB or None if not found.
    """
    doc = get_by_email(email)
    if doc is None:
        return None
    return _doc_to_internal(doc)


def list_users(skip: int = 0, limit: int = 20) -> tuple[list[UserResponse], int]:
    """
    List users with pagination.

    Args:
        skip: Number of records to skip.
        limit: Max records to return.

    Returns:
        Tuple of (list of UserResponse, total count).
    """
    docs = get_all(skip=skip, limit=limit)
    total = count_all()
    items = [_doc_to_response(d) for d in docs]
    return items, total


def update_user(user_id: int, data: UserUpdate, current_user_id: int, current_user_role: UserRole) -> Optional[UserResponse]:
    """
    Update a user's credential fields.

    Only the user themself or an admin can update a user record.
    Only an admin can change the ``role`` field.

    Args:
        user_id: Target user's ID.
        data: Fields to update.
        current_user_id: ID of the authenticated user.
        current_user_role: Role of the authenticated user.

    Returns:
        Updated UserResponse or None if not found.

    Raises:
        PermissionError: If the current user is not allowed.
        ValueError: If the new email is already taken.
    """
    # Permission check
    if not can_modify_user(current_user_id, user_id, current_user_role):
        raise PermissionError("You do not have permission to modify this user.")

    # Fetch existing
    existing = get_by_id(user_id)
    if existing is None:
        return None

    # Build update dict (only provided fields)
    update_data: dict = {}
    if data.email is not None:
        # Check email uniqueness (exclude self)
        if data.email != existing.get("email") and email_exists(data.email):
            raise ValueError(f"Email '{data.email}' is already registered.")
        update_data["email"] = data.email

    if data.password is not None:
        update_data["hashed_password"] = hash_password(data.password)

    if data.role is not None:
        # Only admin can change role
        if current_user_role != UserRole.ADMIN:
            raise PermissionError("Only admins can change a user's role.")
        update_data["role"] = data.role.value

    if data.is_active is not None:
        update_data["is_active"] = data.is_active

    if not update_data:
        # Nothing to update
        return _doc_to_response(existing)

    success = update_user_in_db(user_id, update_data)
    if not success:
        return None

    # Return updated user
    return get_user_by_id(user_id)


def delete_user_by_id(user_id: int, current_user_id: int, current_user_role: UserRole) -> bool:
    """
    Delete a user and their linked profile.

    Only the user themself or an admin can delete a user.

    Args:
        user_id: Target user's ID.
        current_user_id: ID of the authenticated user.
        current_user_role: Role of the authenticated user.

    Returns:
        True if deleted, False if not found.

    Raises:
        PermissionError: If the current user is not allowed.
    """
    if not can_modify_user(current_user_id, user_id, current_user_role):
        raise PermissionError("You do not have permission to delete this user.")

    # Delete profile first
    delete_profile_by_user_id(user_id)

    # Delete user
    return delete_user(user_id)