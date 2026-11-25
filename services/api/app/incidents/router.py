"""
HealthCore — Incidents Router
==============================
FastAPI endpoints for CSV analysis upload and export.

Thin controller: delegates business logic to the service layer.
"""

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from app.incidents.schemas import AnalysisResponse
from app.incidents.service import (
    export_last_result_as_csv,
    process_csv_analysis,
)

router = APIRouter(prefix="/api/incidents", tags=["incidents"])


@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_incidents(file: UploadFile = File(...)):
    """
    Upload a CSV file of incident reports and get a validated analysis summary in JSON.

    - Accepts multipart/form-data with a file field named 'file'.
    - Returns total records, valid/invalid breakdown, by category, by status,
      by country, and satisfaction index.
    - NEVER returns patient_id values (HIPAA / UK GDPR compliant).
    """
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

    # Check file extension
    original_filename = (file.filename or "").lower()
    if not original_filename.endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only CSV files are accepted.",
        )

    # Delegate to service layer
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
async def export_results():
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