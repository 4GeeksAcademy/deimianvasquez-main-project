"""
HealthCore — Incident Constants
=================================
Re-exports all constants from the shared healthcore package.

This file exists to preserve backward compatibility for existing
imports (e.g. ``from app.incidents.constants import IncidentStatus``).
All definitions live in ``healthcore.constants``.
"""

# ruff: noqa: F401  — unused-import, we want these re-exports

from healthcore.constants import (
    BRANCHES,
    CLINIC_ID_TO_BRANCH,
    CSV_CATEGORY_MAP,
    CSV_STATUS_MAP,
    IncidentCategory,
    IncidentOrigin,
    IncidentStatus,
    VALID_TRANSITIONS,
)