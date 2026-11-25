"""
HealthCore — Auth Repository
==============================
Data access layer for the ``reset_tokens`` TinyDB table.

Stores hashed reset tokens so they can be invalidated after use
(preventing replay attacks even if the JWT itself hasn't expired).
"""

from datetime import datetime, timezone
from hashlib import sha256
from typing import Optional

from tinydb import Query

from app.db.tinydb_conn import get_db

# ── Table reference ────────────────────────────────────────────────
RESET_TOKENS_TABLE = get_db().table("reset_tokens")


# ── Helpers ────────────────────────────────────────────────────────

def _hash_token(token: str) -> str:
    """Return a SHA-256 digest of the token for storage."""
    return sha256(token.encode()).hexdigest()


# ── CRUD operations ────────────────────────────────────────────────

def insert_token(user_id: int, token: str, expires_at: str) -> int:
    """
    Store a hashed reset token in the database.

    Args:
        user_id: The TinyDB doc_id of the user.
        token: The raw JWT reset token (will be hashed before storage).
        expires_at: ISO datetime string of the token's expiry.

    Returns:
        The TinyDB document ID of the stored record.
    """
    doc = {
        "user_id": user_id,
        "token_hash": _hash_token(token),
        "expires_at": expires_at,
        "used": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    return RESET_TOKENS_TABLE.insert(doc)


def get_token_record(token: str) -> Optional[dict]:
    """
    Retrieve a reset token record by its raw value.

    The raw token is hashed before querying the DB.

    Args:
        token: The raw JWT reset token.

    Returns:
        The token record dict, or None if not found.
    """
    TokenQuery = Query()
    return RESET_TOKENS_TABLE.get(TokenQuery.token_hash == _hash_token(token))


def mark_token_used(token: str) -> bool:
    """
    Mark a reset token as used (prevents replay).

    Args:
        token: The raw JWT reset token.

    Returns:
        True if the token was found and marked, False otherwise.
    """
    TokenQuery = Query()
    record = RESET_TOKENS_TABLE.get(TokenQuery.token_hash == _hash_token(token))
    if record is None:
        return False
    RESET_TOKENS_TABLE.update({"used": True}, doc_ids=[record.doc_id])
    return True


def delete_expired_tokens() -> int:
    """
    Remove all expired token records from the database.

    Returns:
        The number of deleted records.
    """
    TokenQuery = Query()
    now = datetime.now(timezone.utc).isoformat()
    expired_docs = RESET_TOKENS_TABLE.search(TokenQuery.expires_at < now)
    ids_to_remove = [d.doc_id for d in expired_docs]
    if ids_to_remove:
        RESET_TOKENS_TABLE.remove(doc_ids=ids_to_remove)
    return len(ids_to_remove)