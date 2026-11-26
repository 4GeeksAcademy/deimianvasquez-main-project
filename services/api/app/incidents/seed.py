"""
HealthCore — Incident Seed Script
====================================
Loads incident records from a CSV file into TinyDB.
Applies the same transformations defined in app.incidents.constants.

Usage:
    uv run python -m app.incidents.seed --csv ../../../scripts/incidents-healthcore.csv

Or via the wrapper at the project root:
    uv run python seed_incidents.py --csv scripts/incidents-healthcore.csv
"""

import argparse
import csv
import hashlib
import os
import sys
from datetime import datetime, timezone

from app.db.tinydb_conn import get_db
from app.incidents.constants import (
    CLINIC_ID_TO_BRANCH,
    CSV_CATEGORY_MAP,
    CSV_STATUS_MAP,
)
from app.incidents.repository import (
    incident_exists_by_source_hash,
    insert_incident,
)


def _resolve_csv_path(csv_path: str) -> str:
    """
    Resolve the CSV path.

    - If it is already absolute, use as-is.
    - If it exists relative to the project root, use that.
    - Otherwise try relative to CWD.
    """
    if os.path.isabs(csv_path):
        return csv_path

    # Locate the project root from this file's location:
    #   services/api/app/incidents/seed.py → go up 4 levels → project root
    here = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(here, "..", "..", "..", ".."))

    resolved = os.path.abspath(os.path.join(project_root, csv_path))
    if os.path.isfile(resolved):
        return resolved

    cwd_resolved = os.path.abspath(os.path.join(os.getcwd(), csv_path))
    if os.path.isfile(cwd_resolved):
        return cwd_resolved

    return resolved


def read_csv_rows(csv_path: str) -> list[dict]:
    """Read the CSV file and return a list of dicts."""
    path = _resolve_csv_path(csv_path)
    if not os.path.isfile(path):
        print(f"✗ CSV file not found: {path}")
        sys.exit(1)

    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    print(f"  Source: {path}")
    print(f"  Total rows read: {len(rows)}")
    print(f"  Columns detected: {reader.fieldnames}")
    return rows


def _make_source_hash(row: dict) -> str:
    """
    Build a stable hash from the CSV row data.

    The hash uniquely identifies the source record regardless of when it
    is imported. This allows the seed script to be re-run safely without
    duplicating records.
    """
    raw = "|".join(
        str(row.get(k, ""))
        for k in ("clinic_id", "country", "category", "description", "patient_id", "status")
    )
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def process_row(row: dict, row_index: int) -> dict | None:
    """
    Validate and transform a single CSV row into an incident document.

    Returns a dict ready for insertion, or None if the row is invalid.
    The returned dict uses model-level field names.
    """
    errors: list[str] = []

    # ── Stable source hash (for idempotency) ────────────────
    source_hash = _make_source_hash(row)

    # ── clinic_id → branch ──────────────────────────────────
    clinic_id = (row.get("clinic_id") or "").strip()
    if not clinic_id:
        errors.append("empty clinic_id")
        branch = None
    else:
        branch = CLINIC_ID_TO_BRANCH.get(clinic_id)
        if branch is None:
            errors.append(f"unknown clinic_id '{clinic_id}'")
            branch = None

    # ── category → model category ───────────────────────────
    csv_category = (row.get("category") or "").strip()
    if not csv_category:
        errors.append("empty category")
        category = None
    else:
        category = CSV_CATEGORY_MAP.get(csv_category)
        if category is None:
            errors.append(f"unknown category '{csv_category}'")
            category = None

    # ── status → model status ───────────────────────────────
    csv_status = (row.get("status") or "").strip()
    if not csv_status:
        errors.append("empty status")
        status = None
    else:
        status = CSV_STATUS_MAP.get(csv_status)
        if status is None:
            errors.append(f"unknown status '{csv_status}'")
            status = None

    # ── description → title ─────────────────────────────────
    description = (row.get("description") or "").strip()
    if not description:
        errors.append("empty description")
        title = None
    else:
        # Use first 120 chars as title
        title = description[:120]

    # ── Determine origin ────────────────────────────────────
    country = (row.get("country") or "").strip()
    origin = "customer" if country in ("US", "UK") else "branch"

    # ── Determine created_at ────────────────────────────────
    created_at = datetime.now(timezone.utc).isoformat()

    # ── Report errors ───────────────────────────────────────
    if errors:
        print(f"  ⚠ Row {row_index}: SKIPPED — {'; '.join(errors)}")
        return None

    return {
        "title": title,
        "description": description,
        "category": category,
        "status": status,
        "origin": origin,
        "branch": branch,
        "created_at": created_at,
        "source_hash": source_hash,
    }


def run_seed(csv_path: str) -> None:
    """
    Main seed logic: read CSV, transform, insert non-duplicates.

    Prints a summary of inserted, skipped-invalid, and skipped-duplicate records.
    """
    print("=" * 60)
    print("  HEALTHCORE — INCIDENT SEED")
    print("=" * 60)
    print()

    rows = read_csv_rows(csv_path)
    if not rows:
        print("! No data rows found. Nothing to seed.")
        return

    total = len(rows)
    inserted = 0
    skipped_invalid = 0
    skipped_duplicate = 0

    print()

    for i, row in enumerate(rows):
        doc = process_row(row, i)

        if doc is None:
            skipped_invalid += 1
            continue

        # ── Idempotency check (stable source_hash) ──────────
        if incident_exists_by_source_hash(doc["source_hash"]):
            skipped_duplicate += 1
            continue

        # ── Insert ──────────────────────────────────────────
        incident_id = insert_incident(
            title=doc["title"],
            description=doc["description"],
            category=doc["category"],
            status=doc["status"],
            origin=doc["origin"],
            branch=doc["branch"],
            created_at=doc["created_at"],
            source_hash=doc["source_hash"],
        )
        inserted += 1

    # ── Summary ─────────────────────────────────────────────
    print()
    print("-" * 40)
    print("  SEED SUMMARY")
    print("-" * 40)
    print(f"  Total records in CSV .. {total}")
    print(f"  ├─ Inserted ............. {inserted}")
    print(f"  ├─ Skipped (invalid) .... {skipped_invalid}")
    print(f"  └─ Skipped (duplicate) .. {skipped_duplicate}")
    print()
    print(f"  ✅ Seed completed.")


def main() -> None:
    """Entry point for CLI usage: python -m app.incidents.seed"""
    parser = argparse.ArgumentParser(
        description="HealthCore — Seed incidents from CSV into TinyDB"
    )
    parser.add_argument(
        "--csv",
        default="scripts/incidents-healthcore.csv",
        help="Path to the incidents CSV file (relative to project root or absolute)",
    )
    args = parser.parse_args()
    run_seed(args.csv)


if __name__ == "__main__":
    main()