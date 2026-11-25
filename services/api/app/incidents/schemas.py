"""
HealthCore — Incidents Schemas
===============================
Pydantic models for request validation and response serialization.

Mirrors the TypeScript types defined in uis/backoffice/src/app/incidents/types.ts
"""

from typing import Any

from pydantic import BaseModel


class CategoryBreakdown(BaseModel):
    """Breakdown per category: count and percentage."""

    count: int
    percentage: float


class StatusBreakdown(BaseModel):
    count: int
    percentage: float


class CountryBreakdown(BaseModel):
    count: int
    percentage: float


class ScoreDistribution(BaseModel):
    count: int
    label: str


class SatisfactionIndex(BaseModel):
    scored_cases: int
    total_closed: int
    average_score: float
    distribution: dict[int, ScoreDistribution]  # key = score value (1-5)


class AnalysisResponse(BaseModel):
    """
    Full analysis result returned by POST /api/incidents/analyze.

    NEVER contains patient_id values (HIPAA / UK GDPR compliant).
    """

    total_records: int
    valid_records: int
    invalid_records: int
    invalid_breakdown: dict[str, int]
    by_category: dict[str, CategoryBreakdown]
    by_status: dict[str, StatusBreakdown]
    by_country: dict[str, CountryBreakdown]
    satisfaction: SatisfactionIndex


class IncidentRecord(BaseModel):
    """
    Represents a single validated incident record from the CSV.

    Used internally; never exposed in API responses to maintain HIPAA compliance.
    """

    clinic_id: str
    country: str
    category: str
    status: str
    description: str
    satisfaction_score: int | None = None
    # NOTE: patient_id is intentionally omitted from this schema