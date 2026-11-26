"""
HealthCore — Incident Analyzer (shared logic)
=============================================
CSV validation and metric computation for HealthCore incidents.

Compliant with HIPAA & UK GDPR: NEVER exposes patient_id values.
"""

import csv
import io
from collections import Counter
from typing import Any

# ── Shared constants (single source of truth) ──
from healthcore.constants import (
    RULE_LABELS,
    SCORE_LABELS,
    VALID_CATEGORIES,
    VALID_CLINICS,
    VALID_STATUSES,
)


# ──────────────────────────────────────────────
#  AnalysisResult — data container & serialiser
# ──────────────────────────────────────────────


class AnalysisResult:
    """Container for all analysis results. NEVER contains patient data."""

    def __init__(
        self,
        total_records: int = 0,
        valid_count: int = 0,
        invalid_counts: dict[str, int] | None = None,
        category_counts: dict[str, int] | None = None,
        status_counts: dict[str, int] | None = None,
        country_counts: dict[str, int] | None = None,
        satisfaction_scores: list[int] | None = None,
        total_closed: int = 0,
    ):
        self.total_records = total_records
        self.valid_count = valid_count
        self.invalid_counts = invalid_counts or {}
        self.category_counts = category_counts or {}
        self.status_counts = status_counts or {}
        self.country_counts = country_counts or {}
        self.satisfaction_scores = satisfaction_scores or []
        self.total_closed = total_closed

    @property
    def invalid_count(self) -> int:
        return self.total_records - self.valid_count

    @property
    def satisfaction_avg(self) -> float:
        if self.satisfaction_scores:
            return round(sum(self.satisfaction_scores) / len(self.satisfaction_scores), 2)
        return 0.0

    def to_dict(self) -> dict[str, Any]:
        """Return JSON-serialisable dict (NO patient data)."""
        cat_total = sum(self.category_counts.values()) or 1
        status_total = sum(self.status_counts.values()) or 1
        country_total = sum(self.country_counts.values()) or 1

        score_distribution = {}
        for s in range(1, 6):
            cnt = self.satisfaction_scores.count(s)
            score_distribution[str(s)] = {
                "count": cnt,
                "label": SCORE_LABELS[s],
            }

        return {
            "total_records": self.total_records,
            "valid_records": self.valid_count,
            "invalid_records": self.invalid_count,
            "invalid_breakdown": {
                RULE_LABELS.get(k, k): v
                for k, v in sorted(self.invalid_counts.items())
            },
            "by_category": {
                cat: {"count": cnt, "percentage": round(cnt / cat_total * 100, 1)}
                for cat, cnt in sorted(self.category_counts.items(), key=lambda x: -x[1])
            },
            "by_status": {
                st: {"count": cnt, "percentage": round(cnt / status_total * 100, 1)}
                for st, cnt in sorted(self.status_counts.items(), key=lambda x: -x[1])
            },
            "by_country": {
                co: {"count": cnt, "percentage": round(cnt / country_total * 100, 1)}
                for co, cnt in sorted(self.country_counts.items(), key=lambda x: -x[1])
            },
            "satisfaction": {
                "scored_cases": len(self.satisfaction_scores),
                "total_closed": self.total_closed,
                "average_score": self.satisfaction_avg,
                "distribution": score_distribution,
            },
        }

    def to_csv_rows(self) -> list[dict[str, str | int | float]]:
        """Return list of dicts for CSV export (metric, value, percentage)."""
        rows: list[dict[str, str | int | float]] = []

        # Totals
        rows.append({"metric": "total_records", "value": self.total_records, "percentage": ""})
        rows.append({"metric": "valid_records", "value": self.valid_count, "percentage": ""})
        rows.append({"metric": "invalid_records", "value": self.invalid_count, "percentage": ""})

        # Categories
        cat_total = sum(self.category_counts.values()) or 1
        for cat, cnt in sorted(self.category_counts.items()):
            pct = round(cnt / cat_total * 100, 1)
            rows.append({"metric": f"category_{cat}", "value": cnt, "percentage": pct})

        # Statuses
        status_total = sum(self.status_counts.values()) or 1
        for st, cnt in sorted(self.status_counts.items()):
            pct = round(cnt / status_total * 100, 1)
            rows.append({"metric": f"status_{st}", "value": cnt, "percentage": pct})

        # Countries
        country_total = sum(self.country_counts.values()) or 1
        for co, cnt in sorted(self.country_counts.items()):
            pct = round(cnt / country_total * 100, 1)
            rows.append({"metric": f"country_{co}", "value": cnt, "percentage": pct})

        # Satisfaction
        rows.append({"metric": "satisfaction_scored_cases", "value": len(self.satisfaction_scores), "percentage": ""})
        rows.append({"metric": "satisfaction_total_closed", "value": self.total_closed, "percentage": ""})
        rows.append({"metric": "satisfaction_average_score", "value": self.satisfaction_avg, "percentage": ""})
        for s in range(1, 6):
            rows.append({"metric": f"satisfaction_score_{s}", "value": self.satisfaction_scores.count(s), "percentage": ""})

        return rows


# ──────────────────────────────────────────────
#  CSV parsing
# ──────────────────────────────────────────────


class CSVValidationError(ValueError):
    pass


def read_csv_content(content: str) -> list[dict[str, str]]:
    """Parse CSV string content into list of normalised dicts (lowercase keys)."""
    reader = csv.DictReader(io.StringIO(content), strict=True)
    rows: list[dict[str, str]] = []
    try:
        headers = [header.strip().lower() for header in reader.fieldnames or []]
        required = {"clinic_id", "country", "category", "description", "patient_id", "status"}
        missing = required - set(headers)
        if missing:
            raise CSVValidationError(f"Missing required CSV columns: {', '.join(sorted(missing))}.")
        if any(not header for header in headers) or len(set(headers)) != len(headers):
            raise CSVValidationError("CSV headers must be nonempty and unique.")
        for row in reader:
            if None in row:
                raise CSVValidationError(f"CSV row {reader.line_num} has more fields than the header.")
            if any(value is None for value in row.values()):
                raise CSVValidationError(f"CSV row {reader.line_num} has fewer fields than the header.")
            normalised: dict[str, str] = {}
            for raw_key, value in row.items():
                key = raw_key.strip().lower() if raw_key else ""
                normalised[key] = value.strip() if value else ""
            rows.append(normalised)
    except csv.Error:
        raise CSVValidationError("Invalid CSV format. Check the file and try again.") from None
    if not rows:
        raise CSVValidationError("CSV file has no data rows.")
    return rows


# ──────────────────────────────────────────────
#  Validation
# ──────────────────────────────────────────────


def validate_rows(rows: list[dict[str, str]]) -> tuple[list[dict[str, str]], dict[str, int]]:
    """
    Validate all rows and return (valid_records, invalid_counts).

    Rules applied (in order):
      1. Invalid or missing clinic_id
      2. Country/clinic mismatch
      3. Invalid or missing category
      4. Empty description (< 5 chars)
      5. Missing or malformed patient_id (must match PAT-XXXXXX)
      6. Invalid status
      7. Closed case with no / invalid satisfaction score
    """
    invalid_counts: Counter = Counter()
    valid_records: list[dict[str, str]] = []

    for row in rows:
        rules_broken: list[str] = []

        # 1. Invalid or missing clinic_id
        clinic_id = row.get("clinic_id", "")
        if clinic_id not in VALID_CLINICS:
            rules_broken.append("invalid_clinic_id")
        else:
            # 2. Country/clinic mismatch (only if clinic_id is valid)
            expected_country = VALID_CLINICS[clinic_id]
            actual_country = row.get("country", "")
            if actual_country != expected_country:
                rules_broken.append("country_clinic_mismatch")

        # 3. Invalid or missing category
        category = row.get("category", "")
        if category not in VALID_CATEGORIES:
            rules_broken.append("invalid_category")

        # 4. Empty description (< 5 chars)
        description = row.get("description", "")
        if len(description) < 5:
            rules_broken.append("empty_description")

        # 5. Missing patient_id (format PAT-XXXXXX)
        patient_id = row.get("patient_id", "")
        if not patient_id or not (patient_id.startswith("PAT-") and len(patient_id) == 10 and patient_id[4:].isdigit()):
            rules_broken.append("missing_patient_id")

        # 6 & 7. Status-related rules
        status = row.get("status", "")
        if status not in VALID_STATUSES:
            rules_broken.append("invalid_status")
        else:
            satisfaction_raw = row.get("satisfaction_score", "").strip()
            if status == "CLOSED":
                if satisfaction_raw == "":
                    rules_broken.append("closed_no_score")
                else:
                    try:
                        score = int(satisfaction_raw)
                        if score < 1 or score > 5:
                            rules_broken.append("invalid_satisfaction_score")
                    except ValueError:
                        rules_broken.append("invalid_satisfaction_score")
            elif status in ("OPEN", "DISCARDED"):
                # satisfaction_score not required but if present must be valid
                if satisfaction_raw != "":
                    try:
                        score = int(satisfaction_raw)
                        if score < 1 or score > 5:
                            rules_broken.append("invalid_satisfaction_score")
                    except ValueError:
                        rules_broken.append("invalid_satisfaction_score")

        if rules_broken:
            for rule in rules_broken:
                invalid_counts[rule] += 1
        else:
            valid_records.append(row)

    return valid_records, dict(invalid_counts)


# ──────────────────────────────────────────────
#  Metric computation
# ──────────────────────────────────────────────


def compute_metrics(valid_records: list[dict[str, str]]) -> tuple[Counter, Counter, Counter, list[int], int]:
    """Compute and return (category_counts, status_counts, country_counts, satisfaction_scores, total_closed)."""
    category_counts: Counter = Counter()
    status_counts: Counter = Counter()
    country_counts: Counter = Counter()
    satisfaction_scores: list[int] = []
    total_closed = 0

    for row in valid_records:
        category_counts[row["category"]] += 1
        status_counts[row["status"]] += 1
        country_counts[row["country"]] += 1

        if row["status"] == "CLOSED":
            total_closed += 1
            score = int(row.get("satisfaction_score", "0"))
            satisfaction_scores.append(score)

    return category_counts, status_counts, country_counts, satisfaction_scores, total_closed


# ──────────────────────────────────────────────
#  CSV export (string)
# ──────────────────────────────────────────────


def export_csv_from_result(result: AnalysisResult) -> str:
    """Generate a CSV string from an AnalysisResult."""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["metric", "value", "percentage"])

    for row in result.to_csv_rows():
        writer.writerow([row["metric"], row["value"], row["percentage"]])

    return output.getvalue()


# ──────────────────────────────────────────────
#  Full pipeline
# ──────────────────────────────────────────────


def analyze_csv_content(content: str) -> AnalysisResult:
    """Full analysis pipeline from raw CSV content string."""
    rows = read_csv_content(content)
    total = len(rows)

    if total == 0:
        return AnalysisResult()

    valid_records, invalid_counts = validate_rows(rows)
    cat_counts, st_counts, co_counts, scores, closed = compute_metrics(valid_records)

    return AnalysisResult(
        total_records=total,
        valid_count=len(valid_records),
        invalid_counts=invalid_counts,
        category_counts=dict(cat_counts),
        status_counts=dict(st_counts),
        country_counts=dict(co_counts),
        satisfaction_scores=scores,
        total_closed=closed,
    )