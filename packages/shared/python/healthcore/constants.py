"""
HealthCore — Shared Constants
==============================
Single source of truth for incident model constants used across the monorepo.

Consumers:
  - packages/shared/   (analyzer, CLI scripts)
  - services/api/      (FastAPI incident management)
  - uis/               (frontend validation — future)

Compliance: HIPAA & UK GDPR — NO patient data exposed.
"""

from enum import Enum


# ═══════════════════════════════════════════════════════════════
#  Enums — Incident model
# ═══════════════════════════════════════════════════════════════


class IncidentStatus(str, Enum):
    """Lifecycle status of an incident in HealthCore."""
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    DISCARDED = "discarded"


class IncidentOrigin(str, Enum):
    """Source of the incident report."""
    CUSTOMER = "customer"
    BRANCH = "branch"
    INTERNAL = "internal"


class IncidentCategory(str, Enum):
    """HealthCore incident categories (model level)."""
    CLINICAL_EQUIPMENT = "clinical_equipment"
    IT_SYSTEM = "it_system"
    BILLING_ERROR = "billing_error"
    COMPLIANCE_BREACH = "compliance_breach"
    PATIENT_EXPERIENCE = "patient_experience"
    STAFF_ISSUE = "staff_issue"
    FACILITY_ISSUE = "facility_issue"
    REFERRAL_ISSUE = "referral_issue"
    OTHER = "other"


# ═══════════════════════════════════════════════════════════════
#  Analysis-validation constants (CSV-level)
#  Used by analyzer.py to validate raw CSV rows
# ═══════════════════════════════════════════════════════════════

# Valid clinic codes with their country
VALID_CLINICS: dict[str, str] = {
    "US-TX-01": "US",
    "US-TX-02": "US",
    "US-TX-03": "US",
    "US-FL-01": "US",
    "US-FL-02": "US",
    "US-FL-03": "US",
    "US-GA-01": "US",
    "US-GA-02": "US",
    "US-GA-03": "US",
    "UK-LON-01": "UK",
    "UK-LON-02": "UK",
    "UK-MAN-01": "UK",
}

# Valid raw CSV categories (as they appear in the CSV file)
VALID_CATEGORIES: set[str] = {
    "APPOINTMENT",
    "BILLING",
    "CLINICAL_CARE",
    "ACCESSIBILITY",
    "ADMINISTRATIVE",
}

# Valid raw CSV statuses (as they appear in the CSV file)
VALID_STATUSES: set[str] = {"OPEN", "CLOSED", "DISCARDED"}

# Human-readable labels for each validation rule
RULE_LABELS: dict[str, str] = {
    "invalid_clinic_id": "Invalid or missing clinic_id",
    "country_clinic_mismatch": "Country/clinic mismatch",
    "invalid_category": "Invalid or missing category",
    "empty_description": "Empty description",
    "missing_patient_id": "Missing patient_id",
    "closed_no_score": "Closed case, no score",
    "invalid_satisfaction_score": "Invalid satisfaction score",
    "invalid_status": "Invalid status",
}

# Human-readable labels for satisfaction scores (1–5)
SCORE_LABELS: dict[int, str] = {
    1: "Very dissatisfied",
    2: "Dissatisfied",
    3: "Neutral",
    4: "Satisfied",
    5: "Very satisfied",
}


# ═══════════════════════════════════════════════════════════════
#  HealthCore branches (clinics)
#  Maps internal key → UI display label
# ═══════════════════════════════════════════════════════════════

BRANCHES: dict[str, str] = {
    "central": "Central — Austin Main Clinic",
    "austin_north": "Austin — North",
    "dallas_uptown": "Dallas Uptown",
    "houston_med_center": "Houston Medical Center",
    "san_antonio_west": "San Antonio West",
    "miami_brickell": "Miami Brickell",
    "miami_doral": "Miami Doral",
    "orlando_east": "Orlando East",
    "tampa_bay": "Tampa Bay",
    "atlanta_midtown": "Atlanta Midtown",
    "savannah": "Savannah",
    "london_city": "London City",
    "london_west": "London West End",
    "manchester_central": "Manchester Central",
}

# CSV clinic_id → model branch key (used by seed script)
CLINIC_ID_TO_BRANCH: dict[str, str] = {
    "US-TX-01": "central",
    "US-TX-02": "austin_north",
    "US-TX-03": "houston_med_center",
    "US-FL-01": "miami_brickell",
    "US-FL-02": "orlando_east",
    "US-FL-03": "tampa_bay",
    "US-GA-01": "atlanta_midtown",
    "US-GA-02": "atlanta_midtown",
    "US-GA-03": "savannah",
    "UK-LON-01": "london_city",
    "UK-LON-02": "london_west",
    "UK-MAN-01": "manchester_central",
}


# ═══════════════════════════════════════════════════════════════
#  CSV → Model mappings
#  Transform raw CSV values into model-level enums
# ═══════════════════════════════════════════════════════════════

CSV_STATUS_MAP: dict[str, str] = {
    "OPEN": "open",
    "CLOSED": "resolved",
    "DISCARDED": "discarded",
}

CSV_CATEGORY_MAP: dict[str, str] = {
    "APPOINTMENT": "patient_experience",
    "BILLING": "billing_error",
    "CLINICAL_CARE": "patient_experience",
    "ACCESSIBILITY": "patient_experience",
    "ADMINISTRATIVE": "other",
}


# ═══════════════════════════════════════════════════════════════
#  Status transition rules
#  Maps current status → allowed next statuses
# ═══════════════════════════════════════════════════════════════

VALID_TRANSITIONS: dict[str, set[str]] = {
    "open": {"in_progress", "discarded"},
    "in_progress": {"resolved", "discarded"},
    "resolved": set(),      # terminal state
    "discarded": set(),     # terminal state
}