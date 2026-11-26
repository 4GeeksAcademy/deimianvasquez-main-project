"""
HealthCore — Incidents Service
================================
Business logic layer for incident CSV analysis (v1) and incident management (v2).

Sits between the router (HTTP layer) and the repository (data access).
"""

from typing import Optional

from healthcore.analyzer import AnalysisResult, CSVValidationError, analyze_csv_content

from app.incidents.constants import VALID_TRANSITIONS
from app.incidents.repository import (
    IncidentRepository,
    count_incidents_by_field,
    get_all_incidents,
    get_incident_by_id,
    incident_exists_by_title_and_date,
    insert_incident,
    update_incident_status,
)
from app.incidents.schemas import (
    AnalysisResponse,
    IncidentCreate,
    IncidentListResponse,
    IncidentResponse,
    IncidentStatusUpdate,
    IncidentSummary,
)

# ── Repository instance (in-memory for analysis results) ──
_repo = IncidentRepository()


class NoAnalysisResultError(ValueError):
    pass


class IncidentNotFoundError(ValueError):
    pass


class IncidentValidationError(ValueError):
    pass


# ═══════════════════════════════════════════════
#  CSV Analysis Service (v1 — existing)
# ═══════════════════════════════════════════════


def validate_csv_content(content: str) -> None:
    """
    Validate raw CSV content before analysis.

    Raises ValueError with a descriptive message if validation fails.
    """
    lines = [l.strip() for l in content.split("\n") if l.strip()]

    if len(lines) < 2:
        msg = "File has no data rows. The CSV must contain a header row and at least one data row."
        raise CSVValidationError(msg)

    if "," not in lines[0]:
        msg = "Invalid CSV format. File must be comma-separated (CSV)."
        raise CSVValidationError(msg)


def process_csv_analysis(content: str) -> AnalysisResponse:
    """
    Full pipeline: validate → analyze → store → return response.

    Args:
        content: Raw UTF-8 decoded CSV string.

    Returns:
        AnalysisResponse with validated metrics (no patient data).
    """
    validate_csv_content(content)

    result: AnalysisResult = analyze_csv_content(content)

    # Store in repository for later export
    _repo.save(result)

    return _result_to_response(result)


def export_last_result_as_csv() -> str:
    """
    Export the last analysis result as a CSV string.

    Returns:
        CSV string with columns: metric, value, percentage.

    Raises:
        ValueError: If no analysis has been performed yet.
    """
    from healthcore.analyzer import export_csv_from_result

    result = _repo.get_last()
    if result is None:
        msg = "No analysis results available. Perform a POST /api/incidents/analyze first."
        raise NoAnalysisResultError(msg)

    return export_csv_from_result(result)


def _result_to_response(result: AnalysisResult) -> AnalysisResponse:
    """Convert an AnalysisResult into an AnalysisResponse Pydantic model."""
    return AnalysisResponse(**result.to_dict())


# ═══════════════════════════════════════════════
#  Incident Manager Service (v2)
# ═══════════════════════════════════════════════


def _doc_to_response(doc: dict) -> IncidentResponse:
    """Convert a TinyDB document into an IncidentResponse."""
    return IncidentResponse(
        id=doc["incident_id"],
        title=doc["title"],
        description=doc["description"],
        category=doc["category"],
        status=doc["status"],
        origin=doc["origin"],
        branch=doc["branch"],
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


def create_incident(payload: IncidentCreate) -> IncidentResponse:
    """Create a new incident from validated data. Always starts as 'open'."""
    doc_id = insert_incident(
        title=payload.title,
        description=payload.description,
        category=payload.category,
        status="open",
        origin=payload.origin,
        branch=payload.branch,
    )
    doc = get_incident_by_id(doc_id)
    assert doc is not None
    return _doc_to_response(doc)


def list_incidents(
    status: str | None = None,
    origin: str | None = None,
    branch: str | None = None,
    category: str | None = None,
    search: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> IncidentListResponse:
    """List incidents with optional filters. Returns empty list if none match."""
    docs = get_all_incidents(
        status=status,
        origin=origin,
        branch=branch,
        category=category,
        search=search,
        date_from=date_from,
        date_to=date_to,
    )
    items = [_doc_to_response(d) for d in docs]
    return IncidentListResponse(items=items, total=len(items))


def get_incident(incident_id: str) -> Optional[IncidentResponse]:
    """Get a single incident by ID. Returns None if not found."""
    doc = get_incident_by_id(incident_id)
    if doc is None:
        return None
    return _doc_to_response(doc)


def change_incident_status(incident_id: str, payload: IncidentStatusUpdate) -> IncidentResponse:
    """
    Update the status of an incident, validating the lifecycle transition.

    Raises:
        ValueError: If transition is invalid or incident not found.
    """
    doc = get_incident_by_id(incident_id)
    if doc is None:
        raise IncidentNotFoundError("Incident not found")

    current = doc["status"]
    new_status = payload.status

    allowed = VALID_TRANSITIONS.get(current, set())
    if new_status not in allowed:
        raise IncidentValidationError("Invalid incident status transition.")

    updated = update_incident_status(incident_id, new_status)
    assert updated is not None
    return _doc_to_response(updated)


def get_incident_summary() -> IncidentSummary:
    """Compute aggregated metrics across all incidents."""
    return IncidentSummary(
        by_status=count_incidents_by_field("status"),
        by_category=count_incidents_by_field("category"),
        by_origin=count_incidents_by_field("origin"),
        by_branch=count_incidents_by_field("branch"),
    )