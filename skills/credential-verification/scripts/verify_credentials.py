"""
verify_credentials.py — Credential verification for HealthCore clinical onboarding.

Implements the credential-verification skill checks:
  CA-1: Licence validity
  CA-2: Role validation
  CA-3: CME completion
  CA-4: Jurisdiction coherence
  CA-5: Time-to-hire alert

Usage:
    python verify_credentials.py

Dependencies: Python 3.10+
"""

from datetime import date, datetime, timedelta
from typing import Literal

# ---------------------------------------------------------------------------
# Types (mirror src/types/models.ts)
# ---------------------------------------------------------------------------

CheckStatus = Literal["pass", "warning", "fail"]
Country = Literal["US", "UK"]
ClinicianRole = Literal["physician", "nurse_practitioner", "nurse", "medical_assistant"]

Clinician = dict
Location = dict


class CredentialCheck:
    """Single check result."""

    def __init__(self, check: str, status: CheckStatus, detail: str) -> None:
        self.check = check
        self.status = status
        self.detail = detail

    def to_dict(self) -> dict:
        return {"check": self.check, "status": self.status, "detail": self.detail}


class CredentialReport:
    """Full verification report."""

    def __init__(
        self,
        clinician_id: str,
        full_name: str,
        role: str,
        location_id: str,
        country: Country,
    ) -> None:
        self.clinician_id = clinician_id
        self.full_name = full_name
        self.role = role
        self.location_id = location_id
        self.country = country
        self.checks: list[CredentialCheck] = []

    def add_check(self, check: CredentialCheck) -> None:
        self.checks.append(check)

    @property
    def overall_status(self) -> Literal["clear", "warnings", "blocked"]:
        statuses = [c.status for c in self.checks]
        if "fail" in statuses:
            return "blocked"
        if "warning" in statuses:
            return "warnings"
        return "clear"

    @property
    def summary(self) -> str:
        total = len(self.checks)
        passed = sum(1 for c in self.checks if c.status == "pass")
        warnings = sum(1 for c in self.checks if c.status == "warning")
        failed = sum(1 for c in self.checks if c.status == "fail")
        parts = [f"{passed}/{total} checks passed"]
        if warnings:
            parts.append(f"{warnings} warning(s)")
        if failed:
            parts.append(f"{failed} failure(s)")
        return f"{'BLOCKED' if failed else 'OK'}: {', '.join(parts)}"

    def to_dict(self) -> dict:
        return {
            "clinicianId": self.clinician_id,
            "fullName": self.full_name,
            "role": self.role,
            "locationId": self.location_id,
            "country": self.country,
            "overallStatus": self.overall_status,
            "checks": [c.to_dict() for c in self.checks],
            "summary": self.summary,
        }


# ---------------------------------------------------------------------------
# Supported values
# ---------------------------------------------------------------------------

SUPPORTED_ROLES: set[str] = {"physician", "nurse_practitioner", "nurse", "medical_assistant"}

US_STATE_CODES: set[str] = {
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
    "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
    "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
    "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
    "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
    "DC", "PR", "VI", "GU", "MP", "AS",
}


# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------


def _is_valid_date(value: str) -> bool:
    try:
        datetime.strptime(value, "%Y-%m-%d")
        return True
    except (ValueError, TypeError):
        return False


def _is_valid_gmc_id(value: str) -> bool:
    """UK GMC registration: 'GMC-' followed by exactly 7 digits."""
    import re
    return bool(re.fullmatch(r"GMC-\d{7}", value))


# ---------------------------------------------------------------------------
# Check implementations (CA-1 through CA-5)
# ---------------------------------------------------------------------------


def check_licence_validity(
    clinician: Clinician,
    today: date,
    grace_days: int = 0,
) -> CredentialCheck:
    """CA-1: Verify licence is current (not expired)."""
    expiry_str = clinician.get("licenceExpiryDate", "")

    if not _is_valid_date(expiry_str):
        return CredentialCheck(
            check="Licence validity",
            status="fail",
            detail=f"licenceExpiryDate '{expiry_str}' is not a valid ISO 8601 date.",
        )

    expiry = datetime.strptime(expiry_str, "%Y-%m-%d").date()
    grace_date = expiry + timedelta(days=grace_days)

    if today > grace_date:
        days_overdue = (today - grace_date).days
        return CredentialCheck(
            check="Licence validity",
            status="fail",
            detail=f"Licence expired {days_overdue} day(s) ago (expired: {expiry_str}).",
        )

    if today > expiry:
        remaining = (grace_date - today).days + 1
        return CredentialCheck(
            check="Licence validity",
            status="warning",
            detail=f"Licence expired on {expiry_str} but within grace period ({remaining} day(s) left).",
        )

    remaining = (expiry - today).days
    return CredentialCheck(
        check="Licence validity",
        status="pass",
        detail=f"Licence valid until {expiry_str} ({remaining} day(s) remaining).",
    )


def check_role(clinician: Clinician) -> CredentialCheck:
    """CA-2: Verify clinician role is supported."""
    role = clinician.get("role", "")

    if not role:
        return CredentialCheck(
            check="Role validation",
            status="fail",
            detail="Clinician role is empty.",
        )

    if role not in SUPPORTED_ROLES:
        return CredentialCheck(
            check="Role validation",
            status="fail",
            detail=f"Role '{role}' is not supported. Supported: {', '.join(sorted(SUPPORTED_ROLES))}.",
        )

    return CredentialCheck(
        check="Role validation",
        status="pass",
        detail=f"Role '{role}' is a supported clinician role.",
    )


def check_cme_completion(
    clinician: Clinician,
    threshold_percent: float = 80,
) -> CredentialCheck:
    """CA-3: Verify CME hours meet the required threshold."""
    required = clinician.get("cmeHoursRequired", 0)
    logged = clinician.get("cmeHoursLogged", 0)

    if not isinstance(required, (int, float)) or required <= 0:
        return CredentialCheck(
            check="CME completion",
            status="fail",
            detail=f"cmeHoursRequired must be > 0 (got: {required}).",
        )

    if not isinstance(logged, (int, float)) or logged < 0:
        return CredentialCheck(
            check="CME completion",
            status="fail",
            detail=f"cmeHoursLogged must be >= 0 (got: {logged}).",
        )

    percent = (logged / required) * 100

    if percent >= threshold_percent:
        return CredentialCheck(
            check="CME completion",
            status="pass",
            detail=f"CME {percent:.1f}% complete ({logged}/{required} hours) — meets {threshold_percent}% threshold.",
        )

    if percent >= 50:
        return CredentialCheck(
            check="CME completion",
            status="warning",
            detail=f"CME {percent:.1f}% complete ({logged}/{required} hours) — below {threshold_percent}% threshold.",
        )

    return CredentialCheck(
        check="CME completion",
        status="fail",
        detail=f"CME only {percent:.1f}% complete ({logged}/{required} hours) — below 50% minimum.",
    )


def check_jurisdiction(
    clinician: Clinician,
    location: Location,
) -> CredentialCheck:
    """CA-4: Verify licence and location coherence per country."""
    country = location.get("country", "")
    licence_state = clinician.get("licenceState", "")

    if country == "US":
        if not licence_state:
            return CredentialCheck(
                check="Jurisdiction (US)",
                status="fail",
                detail="licenceState is required for US locations.",
            )
        if licence_state.upper() not in US_STATE_CODES:
            return CredentialCheck(
                check="Jurisdiction (US)",
                status="fail",
                detail=f"licenceState '{licence_state}' is not a valid US state/territory code.",
            )

        location_state = location.get("stateOrCountry", "")
        detail = f"US licence verified ({licence_state})."
        if location_state and licence_state.upper() != location_state.upper():
            detail += f" Note: location is in {location_state}, licence is in {licence_state}."

        return CredentialCheck(
            check="Jurisdiction (US)",
            status="pass",
            detail=detail,
        )

    if country == "UK":
        uk_id = clinician.get("clinicianId", "")
        if uk_id and _is_valid_gmc_id(uk_id):
            return CredentialCheck(
                check="Jurisdiction (UK)",
                status="pass",
                detail=f"UK GMC registration verified ({uk_id}).",
            )

        return CredentialCheck(
            check="Jurisdiction (UK)",
            status="fail",
            detail="UK clinicians must have a valid GMC registration (format: GMC-XXXXXXX) in clinicianId.",
        )

    return CredentialCheck(
        check="Jurisdiction",
        status="fail",
        detail=f"Unknown country '{country}'. Must be 'US' or 'UK'.",
    )


def check_time_to_hire(
    clinician: Clinician,
    today: date,
    threshold_days: int = 47,
) -> CredentialCheck:
    """CA-5: Alert if time-to-hire exceeds HealthCore's average (47 days)."""
    applied_str = clinician.get("appliedAt") or clinician.get("createdAt")

    if not applied_str or not _is_valid_date(applied_str[:10]):
        return CredentialCheck(
            check="Time-to-hire alert",
            status="pass",
            detail="No historical date available — skipping check.",
        )

    applied_date = datetime.strptime(applied_str[:10], "%Y-%m-%d").date()

    if applied_date > today:
        return CredentialCheck(
            check="Time-to-hire alert",
            status="pass",
            detail="Application date is in the future — skipping check.",
        )

    days_elapsed = (today - applied_date).days

    if days_elapsed > threshold_days:
        return CredentialCheck(
            check="Time-to-hire alert",
            status="warning",
            detail=f"Time-to-hire is {days_elapsed} day(s) — exceeds {threshold_days}-day threshold.",
        )

    return CredentialCheck(
        check="Time-to-hire alert",
        status="pass",
        detail=f"Time-to-hire is {days_elapsed} day(s) — within {threshold_days}-day threshold.",
    )


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------


def verify_credentials(
    clinician: Clinician,
    location: Location,
    licence_grace_days: int = 0,
    cme_threshold_percent: float = 80,
    today: date | None = None,
) -> CredentialReport:
    """
    Run all credential checks and return a CredentialReport.

    Args:
        clinician: Clinician dict (src/types/models.ts shape).
        location: Location dict (src/types/models.ts shape).
        licence_grace_days: Days of grace after licence expiry.
        cme_threshold_percent: Minimum CME % to be "on track".
        today: Reference date (defaults to system date).

    Returns:
        CredentialReport with all checks and overall status.
    """
    if today is None:
        today = date.today()

    first_name = clinician.get("firstName", "")
    last_name = clinician.get("lastName", "")

    report = CredentialReport(
        clinician_id=clinician.get("clinicianId", ""),
        full_name=f"{first_name} {last_name}".strip(),
        role=clinician.get("role", ""),
        location_id=location.get("locationId", ""),
        country=location.get("country", "US"),
    )

    report.add_check(check_licence_validity(clinician, today, licence_grace_days))
    report.add_check(check_role(clinician))
    report.add_check(check_cme_completion(clinician, cme_threshold_percent))
    report.add_check(check_jurisdiction(clinician, location))
    report.add_check(check_time_to_hire(clinician, today))

    return report


# ---------------------------------------------------------------------------
# Demo / self-test
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    from pprint import pprint

    # Test case 1: Clinician fully compliant (US, Texas)
    clinician_ok = {
        "clinicianId": "GMC-1234567",
        "firstName": "Jane",
        "lastName": "Doe",
        "role": "physician",
        "locationId": "LOC-AUS-01",
        "licenceState": "TX",
        "licenceExpiryDate": "2027-06-15",
        "cmeHoursRequired": 100,
        "cmeHoursLogged": 85,
        "cmeYearStartDate": "2026-01-01",
        "appliedAt": "2026-11-15",
    }

    location_aus = {
        "locationId": "LOC-AUS-01",
        "name": "Austin Main",
        "city": "Austin",
        "stateOrCountry": "Texas",
        "country": "US",
        "phone": "+1-512-555-0100",
    }

    print("=" * 60)
    print("TEST 1: Fully compliant clinician (US, Texas)")
    print("=" * 60)
    report = verify_credentials(clinician_ok, location_aus)
    pprint(report.to_dict())
    assert report.overall_status == "clear", f"Expected clear, got {report.overall_status}"
    print(f"Overall: {report.overall_status} — {report.summary}\n")

    # Test case 2: Expired licence + low CME (blocked)
    clinician_blocked = {
        **clinician_ok,
        "licenceExpiryDate": "2025-01-01",
        "cmeHoursLogged": 20,
        "appliedAt": "2026-01-15",
    }

    print("=" * 60)
    print("TEST 2: Expired licence + low CME + overdue time-to-hire")
    print("=" * 60)
    report2 = verify_credentials(clinician_blocked, location_aus, cme_threshold_percent=80)
    pprint(report2.to_dict())
    assert report2.overall_status == "blocked", f"Expected blocked, got {report2.overall_status}"
    print(f"Overall: {report2.overall_status} — {report2.summary}\n")

    # Test case 3: UK clinician
    clinician_uk = {
        "clinicianId": "GMC-9876543",
        "firstName": "John",
        "lastName": "Smith",
        "role": "nurse_practitioner",
        "locationId": "LOC-LON-01",
        "licenceState": "",
        "licenceExpiryDate": "2028-03-20",
        "cmeHoursRequired": 60,
        "cmeHoursLogged": 55,
        "cmeYearStartDate": "2026-01-01",
        "appliedAt": "2026-11-01",
    }

    location_lon = {
        "locationId": "LOC-LON-01",
        "name": "London Central",
        "city": "London",
        "stateOrCountry": "Greater London",
        "country": "UK",
        "phone": "+44-20-5555-0100",
    }

    print("=" * 60)
    print("TEST 3: UK clinician (GMC verified)")
    print("=" * 60)
    report3 = verify_credentials(clinician_uk, location_lon)
    pprint(report3.to_dict())
    assert report3.overall_status == "clear", f"Expected clear, got {report3.overall_status}"
    print(f"Overall: {report3.overall_status} — {report3.summary}\n")

    # Test case 4: Borderline CME (warning)
    clinician_warning = {
        **clinician_ok,
        "cmeHoursLogged": 65,
        "appliedAt": "2026-01-15",
    }

    print("=" * 60)
    print("TEST 4: Borderline CME (warning) + time-to-hire alert")
    print("=" * 60)
    report4 = verify_credentials(clinician_warning, location_aus, cme_threshold_percent=80)
    pprint(report4.to_dict())
    assert report4.overall_status == "warnings", f"Expected warnings, got {report4.overall_status}"
    print(f"Overall: {report4.overall_status} — {report4.summary}\n")

    print("All tests passed.")
