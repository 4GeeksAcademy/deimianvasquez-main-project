"""
HealthCore — Incidents Router
================================
FastAPI endpoints for CSV analysis upload/export (v1) and incident management CRUD (v2).

Thin controller: delegates business logic to the service layer.
All endpoints are protected — a valid JWT is required.
"""

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse

from app.auth.deps import get_current_user
from app.incidents.schemas import (
    AnalysisResponse,
    IncidentCreate,
    IncidentListResponse,
    IncidentResponse,
    IncidentStatusUpdate,
    IncidentSummary,
    ValidationErrorDetail,
)
from app.incidents.service import (
    change_incident_status,
    create_incident,
    export_last_result_as_csv,
    get_incident,
    get_incident_summary,
    list_incidents,
    process_csv_analysis,
)
from app.users.schemas import UserCreate

router = APIRouter(prefix="/api/incidents", tags=["incidents"])


# ═══════════════════════════════════════════════
#  v1 — CSV Analysis endpoints (existing)
# ═══════════════════════════════════════════════


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_incidents(
    file: UploadFile = File(...),
    current_user: UserCreate = Depends(get_current_user),
):
    """
    Upload a CSV file of incident reports and get a validated analysis summary in JSON.

    - Accepts multipart/form-data with a file field named 'file'.
    - Returns total records, valid/invalid breakdown, by category, by status,
      by country, and satisfaction index.
    - NEVER returns patient_id values (HIPAA / UK GDPR compliant).
    """
    if not file:
        raise HTTPException(status_code=400, detail="No file provided. Send a CSV file as 'file'.")

    content_bytes = await file.read()
    if not content_bytes:
        raise HTTPException(status_code=400, detail="Empty file. The uploaded CSV contains no data.")

    try:
        content = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=400,
            detail="Invalid file encoding. File must be UTF-8 encoded CSV.",
        )

    original_filename = (file.filename or "").lower()
    if not original_filename.endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only CSV files are accepted.",
        )

    try:
        result = process_csv_analysis(content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing CSV: {str(e)}",
        )

    return result


@router.get("/results/export")
async def export_results(
    current_user: UserCreate = Depends(get_current_user),
):
    """
    Download the last analysis results as a CSV file.

    Returns a CSV with columns: metric, value, percentage.
    Returns 404 if no analysis has been performed yet.
    """
    try:
        csv_content = export_last_result_as_csv()
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=incidents-analysis-report.csv"},
    )


# ═══════════════════════════════════════════════
#  v2 — Incident Management CRUD
# ═══════════════════════════════════════════════


@router.post("", response_model=IncidentResponse, status_code=201)
def create(
    payload: IncidentCreate,
    current_user: UserCreate = Depends(get_current_user),
):
    """
    Create a new incident.

    Validates all required fields. Returns 400 with field-level errors
    if validation fails.
    """
    try:
        return create_incident(payload)
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=[ValidationErrorDetail(field="body", message=str(e)).model_dump()],
        )


@router.get("", response_model=IncidentListResponse)
def list_all(
    status: str | None = Query(None, description="Filter by status"),
    origin: str | None = Query(None, description="Filter by origin"),
    branch: str | None = Query(None, description="Filter by branch"),
    category: str | None = Query(None, description="Filter by category"),
    search: str | None = Query(None, description="Search in title or description"),
    date_from: str | None = Query(None, description="ISO date start (inclusive)"),
    date_to: str | None = Query(None, description="ISO date end (inclusive)"),
    current_user: UserCreate = Depends(get_current_user),
):
    """
    List all incidents, optionally filtered by status, origin, branch, category,
    free-text search, or date range.

    Returns an empty list if no incidents match. Never returns an error
    for an empty database.
    """
    return list_incidents(
        status=status,
        origin=origin,
        branch=branch,
        category=category,
        search=search,
        date_from=date_from,
        date_to=date_to,
    )


@router.get("/summary", response_model=IncidentSummary)
def summary(
    current_user: UserCreate = Depends(get_current_user),
):
    """
    Get aggregated metrics: totals by status, category, origin, and branch.

    Returns zero-count dicts when there are no incidents.
    """
    return get_incident_summary()


@router.get("/{incident_id}", response_model=IncidentResponse)
def get_one(
    incident_id: str,
    current_user: UserCreate = Depends(get_current_user),
):
    """
    Get the detail of a single incident by its ID.

    Returns 404 if the incident does not exist.
    """
    incident = get_incident(incident_id)
    if incident is None:
        raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found.")
    return incident


@router.patch("/{incident_id}/status", response_model=IncidentResponse)
def update_status_endpoint(
    incident_id: str,
    payload: IncidentStatusUpdate,
    current_user: UserCreate = Depends(get_current_user),
):
    """
    Update the status of an incident.

    Validates the transition against lifecycle rules:
    - open → in_progress | discarded
    - in_progress → resolved | discarded
    - resolved / discarded → (terminal, no transitions allowed)

    Returns 400 if the transition is invalid, 404 if not found.
    """
    try:
        return change_incident_status(incident_id, payload)
    except ValueError as e:
        msg = str(e)
        if "not found" in msg.lower():
            raise HTTPException(status_code=404, detail=f"Incident '{incident_id}' not found.")
        raise HTTPException(status_code=400, detail=msg)