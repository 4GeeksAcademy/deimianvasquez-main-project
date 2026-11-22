/* ═══════════════════════════════════════════════
   HealthCore — Candidate Filters Component
   Filtros por estado y etapa usando query params
   ═══════════════════════════════════════════════ */

"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback } from "react";
import {
  CANDIDATE_STATUS_LABELS,
  CANDIDATE_STAGE_LABELS,
  type CandidateStatus,
  type CandidateStage,
} from "@/types";

function CandidateFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const currentStatus = searchParams.get("status") ?? "";
  const currentStage = searchParams.get("stage") ?? "";

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  const statusOptions = Object.entries(CANDIDATE_STATUS_LABELS).map(
    ([value, label]) => ({ value, label })
  );

  const stageOptions = Object.entries(CANDIDATE_STAGE_LABELS).map(
    ([value, label]) => ({ value, label })
  );

  return (
    <div className="flex flex-wrap gap-3">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="filter-status"
          className="text-xs font-medium text-text-secondary"
        >
          Status
        </label>
        <select
          id="filter-status"
          value={currentStatus}
          onChange={(e) => updateFilter("status", e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-700 focus:border-primary-700 min-h-10"
        >
          <option value="">All statuses</option>
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="filter-stage"
          className="text-xs font-medium text-text-secondary"
        >
          Stage
        </label>
        <select
          id="filter-stage"
          value={currentStage}
          onChange={(e) => updateFilter("stage", e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-700 focus:border-primary-700 min-h-10"
        >
          <option value="">All stages</option>
          {stageOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export { CandidateFilters };