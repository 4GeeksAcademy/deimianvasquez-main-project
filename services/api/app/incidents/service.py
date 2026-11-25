"""
HealthCore — Incidents Service
================================
Business logic layer for incident CSV analysis.

Sits between the router (HTTP layer) and the repository (data access).
Handles CSV validation, delegates analysis to the shared analyzer,
and orchestrates storage of results.
"""

from healthcore.analyzer import AnalysisResult, analyze_csv_content

from app.incidents.repository import IncidentRepository
from app.incidents.schemas import AnalysisResponse

# ── Repository instance (in-memory for now) ──
_repo = IncidentRepository()


def validate_csv_content(content: str) -> None:
    """
    Validate raw CSV content before analysis.

    Raises ValueError with a descriptive message if validation fails.
    """
    lines = [l.strip() for l in content.split("\n") if l.strip()]

    if len(lines) < 2:
        msg = "File has no data rows. The CSV must contain a header row and at least one data row."
        raise ValueError(msg)

    if "," not in lines[0]:
        msg = "Invalid CSV format. File must be comma-separated (CSV)."
        raise ValueError(msg)


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
        raise ValueError(msg)

    return export_csv_from_result(result)


def _result_to_response(result: AnalysisResult) -> AnalysisResponse:
    """Convert an AnalysisResult into an AnalysisResponse Pydantic model."""
    return AnalysisResponse(**result.to_dict())