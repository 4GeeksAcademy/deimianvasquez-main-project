"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import type { IncidentSummary } from "../types";
import {
  INCIDENT_CATEGORIES,
  INCIDENT_ORIGINS,
  INCIDENT_BRANCHES,
} from "../types";
import { fetchWithAuth, API_BASE } from "@/services/api";

// Empty – we use translation keys via the "status_" prefix in renderBreakdown
const STATUS_LABELS: Record<string, string> = {};

export default function IncidentSummaryPanel() {
  const t = useTranslations("incidents");
  const [summary, setSummary] = useState<IncidentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE}/api/incidents/summary`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data: IncidentSummary = await res.json();
      setSummary(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("summary_error"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const totalIncidents = summary
    ? Object.values(summary.by_status).reduce((a, b) => a + b, 0)
    : 0;

  // ── Helper to render a breakdown table ──
  const renderBreakdown = (
    data: Record<string, number> | undefined,
    labelMap: Record<string, string>,
    translationPrefix: string,
  ) => {
    if (!data) return <p className="text-sm text-text-secondary">{t("summary_empty")}</p>;

    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0)
      return <p className="text-sm text-text-secondary">{t("summary_empty")}</p>;

    const maxCount = entries[0][1];

    return (
      <div className="space-y-2">
        {entries.map(([key, count]) => {
          const label =
            labelMap[key] ??
            t(`${translationPrefix}${key}`, { default: key });
          const pct = totalIncidents > 0 ? (count / totalIncidents) * 100 : 0;
          const barWidth = maxCount > 0 ? (count / maxCount) * 100 : 0;
          return (
            <div key={key} className="flex items-center gap-3 text-sm">
              <span className="text-text-secondary min-w-[10ch]">{label}</span>
              <div className="flex-1 h-1.5 bg-primary-700/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-700 rounded-full"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <span className="text-text-primary font-medium tabular-nums">
                {count}
              </span>
              <span className="text-text-secondary tabular-nums">
                ({pct.toFixed(1)}%)
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      {/* Loading */}
      {loading && (
        <div className="p-4 text-sm text-text-secondary">{t("summary_loading")}</div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-error/10 border border-error/30 rounded-lg text-sm text-error">
          {error}
        </div>
      )}

      {/* Summary cards */}
      {!loading && !error && summary && (
        <>
          {/* Total big number */}
          <div className="mb-6 p-6 bg-surface rounded-xl border border-border text-center">
            <p className="text-sm text-text-secondary">{t("summary_total")}</p>
            <p className="text-4xl font-bold text-brand-900 font-heading mt-1">
              {totalIncidents}
            </p>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* By Status */}
            <div className="p-5 bg-surface rounded-xl border border-border">
              <h3 className="text-base font-semibold text-text-primary mb-4">
                {t("summary_by_status")}
              </h3>
              {renderBreakdown(summary.by_status, STATUS_LABELS, "status_")}
            </div>

            {/* By Category */}
            <div className="p-5 bg-surface rounded-xl border border-border">
              <h3 className="text-base font-semibold text-text-primary mb-4">
                {t("summary_by_category")}
              </h3>
              {renderBreakdown(summary.by_category, INCIDENT_CATEGORIES, "")}
            </div>

            {/* By Origin */}
            <div className="p-5 bg-surface rounded-xl border border-border">
              <h3 className="text-base font-semibold text-text-primary mb-4">
                {t("summary_by_origin")}
              </h3>
              {renderBreakdown(summary.by_origin, INCIDENT_ORIGINS, "")}
            </div>

            {/* By Branch */}
            <div className="p-5 bg-surface rounded-xl border border-border">
              <h3 className="text-base font-semibold text-text-primary mb-4">
                {t("summary_by_branch")}
              </h3>
              {renderBreakdown(summary.by_branch, INCIDENT_BRANCHES, "")}
            </div>
          </div>
        </>
      )}

      {/* Empty state (no error, not loading, no data) */}
      {!loading && !error && !summary && (
        <div className="p-8 text-center text-text-secondary">
          <p className="text-base font-medium">{t("summary_empty")}</p>
          <p className="text-sm mt-1">{t("summary_empty_hint")}</p>
        </div>
      )}
    </div>
  );
}