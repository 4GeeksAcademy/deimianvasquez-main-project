"""
HealthCore — Users Repository
==============================
Data access layer for the ``users`` TinyDB table.
"""

from typing import Optional

from tinydb import Query

from app.db.tinydb_conn import get_db

# ── Table reference ────────────────────────────────────────────────
USERS_TABLE = get_db().table("users")


# ── CRUD operations ────────────────────────────────────────────────

def insert(doc: dict) -> int:
    """
    Insert a new user document.

    Args:
        doc: User data including ``hashed_password``.

    Returns:
        The TinyDB document ID (``doc_id``).
    """
    return USERS_TABLE.insert(doc)


def get_by_id(doc_id: int) -> Optional[dict]:
    """
    Retrieve a user by its TinyDB document ID.

    Args:
        doc_id: The TinyDB doc_id.

    Returns:
        The user dict or None if not found.
    """
    return USERS_TABLE.get(doc_id=doc_id)


def get_by_email(email: str) -> Optional[dict]:
    """
    Retrieve a user by email.

    Args:
        email: The user's email address.

    Returns:
        The user dict or None if not found.
    """
    UserQuery = Query()
    return USERS_TABLE.get(UserQuery.email == email)


def get_all(skip: int = 0, limit: int = 20) -> list[dict]:
    """
    Retrieve all users with pagination.

    Args:
        skip: Number of records to skip.
        limit: Max records to return.

    Returns:
        List of user dicts.
    """
    return USERS_TABLE.all()[skip : skip + limit]


def count_all() -> int:
    """Return total number of users."""
    return len(USERS_TABLE)


def update(doc_id: int, data: dict) -> bool:
    """
    Update a user document.

    Args:
        doc_id: The TinyDB doc_id of the user to update.
        data: Dict of fields to update.

    Returns:
        True if the user existed and was updated, False otherwise.
    """
    if USERS_TABLE.get(doc_id=doc_id) is None:
        return False
    USERS_TABLE.update(data, doc_ids=[doc_id])
    return True


def delete(doc_id: int) -> bool:
    """
    Delete a user by its document ID.

    Args:
        doc_id: The TinyDB doc_id.

    Returns:
        True if the user existed and was deleted, False otherwise.
    """
    if USERS_TABLE.get(doc_id=doc_id) is None:
        return False
    USERS_TABLE.remove(doc_ids=[doc_id])
    return True


def email_exists(email: str) -> bool:
    """
    Check if an email is already registered.

    Args:
        email: Email to check.

    Returns:
        True if the email exists, False otherwise.
    """
    UserQuery = Query()
    return USERS_TABLE.contains(UserQuery.email == email)