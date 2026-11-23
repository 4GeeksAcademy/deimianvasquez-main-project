"""
HealthCore — Incidents Router
==============================
Endpoints for CSV analysis upload and export.
Uses shared analysis logic from packages/shared/python/healthcore/analyzer.py.
"""

from typing import Optional

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from healthcore.analyzer import AnalysisResult, analyze_csv_content, export_csv_from_result

router = APIRouter(prefix="/api/incidents", tags=["incidents"])

# In-memory storage for the last analysis result
_last_analysis: Optional[AnalysisResult] = None


@router.post("/analyze")
async def analyze_incidents(file: UploadFile = File(...)):
    """
    Upload a CSV file of incident reports and get a validated analysis summary in JSON.

    - Accepts multipart/form-data with a file field named 'file'.
    - Returns total records, valid/invalid breakdown, by category, by status,
      by country, and satisfaction index.
    - NEVER returns patient_id values (HIPAA / UK GDPR compliant).
    """
    global _last_analysis  # noqa: PLW0603

    # Validate file presence
    if not file:
        raise HTTPException(status_code=400, detail="No file provided. Send a CSV file as 'file'.")

    # Read content
    content_bytes = await file.read()
    if not content_bytes:
        raise HTTPException(status_code=400, detail="Empty file. The uploaded CSV contains no data.")

    # Try to decode as UTF-8
    try:
        content = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=400,
            detail="Invalid file encoding. File must be UTF-8 encoded CSV.",
        )

    # Check for empty content (just headers or nothing)
    lines = [l.strip() for l in content.split("\n") if l.strip()]
    if len(lines) < 2:
        raise HTTPException(
            status_code=400,
            detail="File has no data rows. The CSV must contain a header row and at least one data row.",
        )

    # Verify it looks like CSV with comma separator
    if "," not in lines[0]:
        raise HTTPException(
            status_code=400,
            detail="Invalid CSV format. File must be comma-separated (CSV).",
        )

    # Check file extension / MIME type
    original_filename = (file.filename or "").lower()
    if not original_filename.endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only CSV files are accepted.",
        )

    # Run analysis
    try:
        result = analyze_csv_content(content)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing CSV: {str(e)}",
        )

    # Store for export
    _last_analysis = result

    return result.to_dict()


@router.get("/results/export")
async def export_results():
    """
    Download the last analysis results as a CSV file.

    Returns a CSV with columns: metric, value, percentage.
    Returns 404 if no analysis has been performed yet.
    """
    if _last_analysis is None:
        raise HTTPException(
            status_code=404,
            detail="No analysis results available. Perform a POST /api/incidents/analyze first.",
        )

    csv_content = export_csv_from_result(_last_analysis)

    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=incidents-analysis-report.csv"},
    )