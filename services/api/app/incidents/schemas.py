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


# ──────────────────────────────────────────────
#  Incident Manager — Schemas
# ──────────────────────────────────────────────


from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator

from app.incidents.constants import BRANCHES


class IncidentCreate(BaseModel):
    """Schema for creating a new incident."""

    title: str = Field(..., min_length=1, max_length=255, description="Brief title of the incident")
    description: str = Field(..., min_length=1, max_length=5000, description="Detailed description")
    category: str = Field(..., description="Incident category")
    origin: str = Field(..., description="Origin: customer, branch, or internal")
    branch: str = Field(..., description="Branch/clinic code")

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        from app.incidents.constants import IncidentCategory
        valid = [e.value for e in IncidentCategory]
        if v not in valid:
            raise ValueError(f"Invalid category '{v}'. Must be one of: {', '.join(valid)}")
        return v

    @field_validator("origin")
    @classmethod
    def validate_origin(cls, v: str) -> str:
        from app.incidents.constants import IncidentOrigin
        valid = [e.value for e in IncidentOrigin]
        if v not in valid:
            raise ValueError(f"Invalid origin '{v}'. Must be one of: {', '.join(valid)}")
        return v

    @field_validator("branch")
    @classmethod
    def validate_branch(cls, v: str) -> str:
        if v not in BRANCHES:
            valid = ", ".join(sorted(BRANCHES.keys()))
            raise ValueError(f"Invalid branch '{v}'. Must be one of: {valid}")
        return v

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Title cannot be empty or only whitespace.")
        return v.strip()

    @field_validator("description")
    @classmethod
    def description_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Description cannot be empty or only whitespace.")
        return v.strip()


class IncidentStatusUpdate(BaseModel):
    """Schema for updating only the status of an incident."""

    status: str = Field(..., description="New status value")

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        from app.incidents.constants import IncidentStatus
        valid = [e.value for e in IncidentStatus]
        if v not in valid:
            raise ValueError(f"Invalid status '{v}'. Must be one of: {', '.join(valid)}")
        return v


class IncidentResponse(BaseModel):
    """Schema for a single incident in API responses."""

    id: str
    title: str
    description: str
    category: str
    status: str
    origin: str
    branch: str
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class IncidentListResponse(BaseModel):
    """Response wrapper for listing incidents."""

    items: list[IncidentResponse]
    total: int


class ValidationErrorDetail(BaseModel):
    """A single field validation error."""

    field: str
    message: str


class ValidationErrorResponse(BaseModel):
    """400 response with field-level errors."""

    detail: list[ValidationErrorDetail]


class IncidentSummary(BaseModel):
    """Aggregated metrics from /api/incidents/summary."""

    by_status: dict[str, int]
    by_category: dict[str, int]
    by_origin: dict[str, int]
    by_branch: dict[str, int]