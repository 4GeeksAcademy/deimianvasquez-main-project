"""
HealthCore — shared analysis logic and constants for scripts, API, and frontend.

Usage:
    from healthcore import IncidentStatus, IncidentCategory
    from healthcore import AnalysisResult, analyze_csv_content
"""

from healthcore.analyzer import AnalysisResult, analyze_csv_content, export_csv_from_result, read_csv_content
from healthcore.constants import (
    BRANCHES,
    CLINIC_ID_TO_BRANCH,
    CSV_CATEGORY_MAP,
    CSV_STATUS_MAP,
    IncidentCategory,
    IncidentOrigin,
    IncidentStatus,
    RULE_LABELS,
    SCORE_LABELS,
    VALID_CATEGORIES,
    VALID_CLINICS,
    VALID_STATUSES,
    VALID_TRANSITIONS,
)

__all__ = [
    # Analyzer
    "AnalysisResult",
    "analyze_csv_content",
    "export_csv_from_result",
    "read_csv_content",
    # Enums
    "IncidentStatus",
    "IncidentOrigin",
    "IncidentCategory",
    # Validation (CSV-level)
    "VALID_CLINICS",
    "VALID_CATEGORIES",
    "VALID_STATUSES",
    "RULE_LABELS",
    "SCORE_LABELS",
    # Business mappings
    "BRANCHES",
    "CLINIC_ID_TO_BRANCH",
    "CSV_STATUS_MAP",
    "CSV_CATEGORY_MAP",
    "VALID_TRANSITIONS",
]