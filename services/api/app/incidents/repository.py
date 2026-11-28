"""
HealthCore — Incidents Repository
===================================
Data access layer for incident analysis results and incident management.

Currently uses in-memory storage for analysis results (v1) and
TinyDB for incident CRUD (v2).
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from tinydb import Query

from app.db.tinydb_conn import get_db
from healthcore.analyzer import AnalysisResult

# ── TinyDB table name ──
_INCIDENTS_TABLE = "incidents"


# ═══════════════════════════════════════════════
#  Analysis Repository (v1 — existing)
# ═══════════════════════════════════════════════


class IncidentRepository:
    """
    Repository for storing and retrieving analysis results.

    Thread-safe for single-worker deployments. For multi-worker,
    swap the internal storage for a database backend.
    """

    def __init__(self) -> None:
        self._last_result: Optional[AnalysisResult] = None

    def save(self, result: AnalysisResult) -> None:
        """
        Persist an analysis result.

        Currently stores only the most recent result (overwrites previous).
        In a future version this could append to a history table.
        """
        self._last_result = result

    def get_last(self) -> Optional[AnalysisResult]:
        """Retrieve the most recent analysis result."""
        return self._last_result

    def clear(self) -> None:
        """Clear the stored result."""
        self._last_result = None


# ═══════════════════════════════════════════════
#  Incident Manager Repository (v2 — TinyDB)
# ═══════════════════════════════════════════════


def _table():
    """Return the TinyDB table for incidents."""
    return get_db().table(_INCIDENTS_TABLE)


def insert_incident(
    title: str,
    description: str,
    category: str,
    status: str,
    origin: str,
    branch: str,
    created_at: str | None = None,
    source_hash: str | None = None,
) -> str:
    """
    Insert a new incident document into TinyDB.

    Args:
        source_hash: Optional stable hash from CSV data. Used for idempotency
                     across seed re-runs.

    Returns the generated document ID (incident_id).
    """
    now = datetime.now(timezone.utc).isoformat()
    doc_id = uuid4().hex[:16]

    doc = {
        "incident_id": doc_id,
        "title": title,
        "description": description,
        "category": category,
        "status": status,
        "origin": origin,
        "branch": branch,
        "created_at": created_at or now,
        "updated_at": now,
    }
    if source_hash is not None:
        doc["source_hash"] = source_hash

    _table().insert(doc)
    return doc_id


def get_all_incidents(
    status: str | None = None,
    origin: str | None = None,
    branch: str | None = None,
    category: str | None = None,
    search: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    skip: int = 0,
    limit: int = 20,
) -> tuple[list[dict], int]:
    """
    Return all incidents, optionally filtered (AND logic).
    - search: matches against title or description (case-insensitive).
    - date_from / date_to: inclusive ISO date range on created_at.
    - skip / limit: pagination parameters.
    Results sorted by created_at descending.
    Returns (items, total) tuple.
    """
    docs = _table().all()
    result = []
    search_lower = search.lower() if search else None

    for doc in docs:
        if status and doc.get("status") != status:
            continue
        if origin and doc.get("origin") != origin:
            continue
        if branch and doc.get("branch") != branch:
            continue
        if category and doc.get("category") != category:
            continue
        if search_lower:
            title = (doc.get("title") or "").lower()
            desc = (doc.get("description") or "").lower()
            if search_lower not in title and search_lower not in desc:
                continue
        if date_from:
            created = doc.get("created_at", "")
            if created < date_from:
                continue
        if date_to:
            # Include full day if date_to is just YYYY-MM-DD
            end = date_to + "T23:59:59" if "T" not in date_to else date_to
            created = doc.get("created_at", "")
            if created > end:
                continue
        result.append(doc)

    result.sort(key=lambda d: d.get("created_at", ""), reverse=True)
    total = len(result)
    page = result[skip: skip + limit]
    return page, total


def get_incident_by_id(incident_id: str) -> Optional[dict]:
    """Return a single incident by its ID, or None."""
    Entry = Query()
    return _table().get(Entry.incident_id == incident_id)


def update_incident_status(incident_id: str, new_status: str) -> Optional[dict]:
    """
    Update the status of an incident. Returns the updated document or None.
    """
    Entry = Query()
    now = datetime.now(timezone.utc).isoformat()
    _table().update(
        {"status": new_status, "updated_at": now},
        Entry.incident_id == incident_id,
    )
    return get_incident_by_id(incident_id)


def incident_exists_by_title_and_date(title: str, created_at: str) -> bool:
    """
    Check for idempotency: does an incident with the same title + date exist?
    """
    Entry = Query()
    return _table().get((Entry.title == title) & (Entry.created_at == created_at)) is not None


def incident_exists_by_source_hash(source_hash: str) -> bool:
    """
    Check for idempotency: does an incident with this stable source_hash exist?

    Used by the seed script to avoid duplicating records across re-runs.
    """
    Entry = Query()
    return _table().get(Entry.source_hash == source_hash) is not None


def count_incidents_by_field(field: str) -> dict[str, int]:
    """Count incidents grouped by a field value."""
    counts: dict[str, int] = {}
    for doc in _table().all():
        val = doc.get(field, "unknown")
        counts[val] = counts.get(val, 0) + 1
    return counts