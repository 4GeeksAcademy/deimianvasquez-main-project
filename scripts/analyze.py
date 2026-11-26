#!/usr/bin/env python3
"""
HealthCore — Patient Incident Report Analysis (CLI)
====================================================
Processes a CSV file of patient incident reports and produces
a validated summary in the terminal with breakdowns by category,
status, country, and satisfaction scores.

Usage:
    python analyze.py <path-to-csv>

Compliance:
    - HIPAA (US clinics) & UK GDPR (UK clinics)
    - NEVER prints, logs, or exports patient_id values.
"""

import os
import sys
from collections import Counter

# ── Ensure shared module is importable ──
_SHARED_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "packages", "shared", "python")
)
if _SHARED_DIR not in sys.path:
    sys.path.insert(0, _SHARED_DIR)

from healthcore.analyzer import (  # noqa: E402
    RULE_LABELS,
    SCORE_LABELS,
    AnalysisResult,
    read_csv_content,
    validate_rows,
    compute_metrics,
    export_csv_from_result,
)


# ── Report formatting ──


def format_header(title: str) -> str:
    return f"{'=' * 60}\n  {title}\n{'=' * 60}"


def print_report(
    filepath: str,
    total: int,
    valid_count: int,
    invalid_counts: dict[str, int],
    category_counts: Counter,
    status_counts: Counter,
    country_counts: Counter,
    satisfaction_scores: list[int],
    total_closed: int,
) -> None:
    """Print the complete report to stdout."""
    print(format_header("HEALTHCORE — PATIENT INCIDENT REPORT ANALYSIS"))
    print(f"  Source file: {os.path.basename(filepath)}")
    print()

    # ── Totals ──
    print(f"TOTAL RECORDS IN FILE .......... {total}")
    print(f"  ├─ Valid records ................ {valid_count}")
    print(f"  └─ Invalid / incomplete .......... {total - valid_count}")

    # ── Invalid breakdown ──
    print()
    print("INVALID RECORDS BREAKDOWN")
    rules_order = [
        "invalid_clinic_id",
        "country_clinic_mismatch",
        "invalid_category",
        "empty_description",
        "missing_patient_id",
        "closed_no_score",
    ]
    for rule in rules_order:
        count = invalid_counts.get(rule, 0)
        label = RULE_LABELS.get(rule, rule)
        print(f"  ├─ {label} .. {count}")

    # Extra rules not in the standard list
    standard = set(rules_order)
    for rule, count in sorted(invalid_counts.items()):
        if rule not in standard:
            label = RULE_LABELS.get(rule, rule)
            print(f"  ├─ {label} .. {count}")

    # ── Category breakdown ──
    print()
    print("BREAKDOWN BY CATEGORY (valid records)")
    sorted_cats = sorted(category_counts.items(), key=lambda x: -x[1])
    cat_total = sum(category_counts.values())
    for i, (cat, count) in enumerate(sorted_cats):
        pct = (count / cat_total * 100) if cat_total else 0
        prefix = "  └─" if i == len(sorted_cats) - 1 else "  ├─"
        dots = "." * max(1, 34 - len(cat))
        print(f"{prefix} {cat} {dots} {count:>3}  ({pct:.1f}%)")

    # ── Status breakdown ──
    print()
    print("BREAKDOWN BY STATUS (valid records)")
    sorted_statuses = sorted(status_counts.items(), key=lambda x: -x[1])
    status_total = sum(status_counts.values())
    for i, (st, count) in enumerate(sorted_statuses):
        pct = (count / status_total * 100) if status_total else 0
        prefix = "  └─" if i == len(sorted_statuses) - 1 else "  ├─"
        dots = "." * max(1, 34 - len(st))
        print(f"{prefix} {st} {dots} {count:>3}  ({pct:.1f}%)")

    # ── Country breakdown ──
    print()
    print("BREAKDOWN BY COUNTRY (valid records)")
    sorted_countries = sorted(country_counts.items(), key=lambda x: -x[1])
    country_total = sum(country_counts.values())
    for i, (co, count) in enumerate(sorted_countries):
        pct = (count / country_total * 100) if country_total else 0
        prefix = "  └─" if i == len(sorted_countries) - 1 else "  ├─"
        dots = "." * max(1, 34 - len(co))
        print(f"{prefix} {co} {dots} {count:>3}  ({pct:.1f}%)")

    # ── Satisfaction index ──
    print()
    print("SATISFACTION INDEX (closed cases)")
    scored = len(satisfaction_scores)
    print(f"  Scored cases: {scored} of {total_closed}")
    avg = sum(satisfaction_scores) / scored if scored > 0 else 0
    print(f"  Average score: {avg:.2f} / 5.00")
    score_counts = Counter(satisfaction_scores)
    for score in range(1, 6):
        cnt = score_counts.get(score, 0)
        label = SCORE_LABELS[score]
        prefix = "  └─" if score == 5 else "  ├─"
        print(f"  {prefix} Score {score} ({label:<20}) {cnt}")

    # ── Footer ──
    print()
    print("=" * 60)


def read_csv(filepath: str) -> tuple[dict[str, str], list[dict[str, str]]]:
    """Read CSV from file and return (header_map, normalised_rows)."""
    with open(filepath, mode="r", encoding="utf-8") as f:
        content = f.read()
    rows = read_csv_content(content)
    first_line = content.split("\n")[0].strip()
    original_headers = {h.strip().lower(): h.strip() for h in first_line.split(",")}
    return original_headers, rows


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python analyze.py <path-to-csv>", file=sys.stderr)
        sys.exit(1)

    filepath = sys.argv[1]

    if not os.path.isfile(filepath):
        print("Error: File not found or not a regular file.", file=sys.stderr)
        sys.exit(1)

    # Read CSV
    try:
        _, rows = read_csv(filepath)
    except UnicodeDecodeError:
        print("Error: File must be encoded in UTF-8.", file=sys.stderr)
        sys.exit(1)
    except OSError:
        print("Error: Unable to read the file. Check its availability and permissions.", file=sys.stderr)
        sys.exit(1)
    except ValueError as error:
        print(f"Error: {error}", file=sys.stderr)
        sys.exit(1)
    total = len(rows)

    # Validate
    valid_records, invalid_counts = validate_rows(rows)

    # Metrics
    category_counts, status_counts, country_counts, satisfaction_scores, total_closed = compute_metrics(valid_records)

    # Print report
    print_report(
        filepath, total, len(valid_records), invalid_counts,
        category_counts, status_counts, country_counts,
        satisfaction_scores, total_closed,
    )

    # Ask for CSV export
    try:
        answer = input("Export results to CSV? [y / n]: ").strip().lower()
        if answer == "y":
            result = AnalysisResult(
                total_records=total,
                valid_count=len(valid_records),
                invalid_counts=invalid_counts,
                category_counts=dict(category_counts),
                status_counts=dict(status_counts),
                country_counts=dict(country_counts),
                satisfaction_scores=satisfaction_scores,
                total_closed=total_closed,
            )
            csv_output = export_csv_from_result(result)
            base = os.path.splitext(filepath)[0]
            export_path = f"{base}-report.csv"
            try:
                with open(export_path, "w", encoding="utf-8") as f:
                    f.write(csv_output)
            except OSError:
                print("Error: Unable to write the report. Check the destination and permissions.", file=sys.stderr)
                sys.exit(1)
            print(f"Report exported to: {export_path}")
    except (EOFError, KeyboardInterrupt):
        pass


if __name__ == "__main__":
    main()


if __name__ == "__main__":
    main()