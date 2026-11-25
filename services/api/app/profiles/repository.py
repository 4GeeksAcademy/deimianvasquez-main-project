"""
HealthCore — Profiles Repository
=================================
Data access layer for the ``profiles`` TinyDB table.
"""

from typing import Optional

from tinydb import Query

from app.db.tinydb_conn import get_db

# ── Table reference ────────────────────────────────────────────────
PROFILES_TABLE = get_db().table("profiles")


# ── CRUD operations ────────────────────────────────────────────────

def insert(doc: dict) -> int:
    """
    Insert a new profile document.

    Args:
        doc: Profile data including ``user_id``.

    Returns:
        The TinyDB document ID (``doc_id``).
    """
    return PROFILES_TABLE.insert(doc)


def get_by_id(doc_id: int) -> Optional[dict]:
    """
    Retrieve a profile by its TinyDB document ID.

    Args:
        doc_id: The TinyDB doc_id.

    Returns:
        The profile dict or None if not found.
    """
    return PROFILES_TABLE.get(doc_id=doc_id)


def get_by_user_id(user_id: int) -> Optional[dict]:
    """
    Retrieve a profile by its linked user ID.

    Args:
        user_id: The TinyDB doc_id of the linked user.

    Returns:
        The profile dict or None if not found.
    """
    ProfileQuery = Query()
    return PROFILES_TABLE.get(ProfileQuery.user_id == user_id)


def update_by_user_id(user_id: int, data: dict) -> bool:
    """
    Update a profile by its linked user ID.

    Args:
        user_id: The TinyDB doc_id of the linked user.
        data: Dict of fields to update.

    Returns:
        True if the profile existed and was updated, False otherwise.
    """
    ProfileQuery = Query()
    existing = PROFILES_TABLE.get(ProfileQuery.user_id == user_id)
    if existing is None:
        return False
    PROFILES_TABLE.update(data, ProfileQuery.user_id == user_id)
    return True


def delete_by_user_id(user_id: int) -> bool:
    """
    Delete a profile by its linked user ID.

    Args:
        user_id: The TinyDB doc_id of the linked user.

    Returns:
        True if the profile existed and was deleted, False otherwise.
    """
    ProfileQuery = Query()
    existing = PROFILES_TABLE.get(ProfileQuery.user_id == user_id)
    if existing is None:
        return False
    PROFILES_TABLE.remove(ProfileQuery.user_id == user_id)
    return True