"use client";

import { useTranslations } from "next-intl";
import type { AnalysisResult } from "../types";

interface ResultsPanelProps {
  result: AnalysisResult;
  onExport: () => void;
  exporting: boolean;
}

export default function ResultsPanel({ result, onExport, exporting }: ResultsPanelProps) {
  const t = useTranslations("incidents");
  const totalPct =
    result.total_records > 0
      ? (result.valid_records / result.total_records) * 100
      : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          label={t("total_records")}
          value={result.total_records}
          color="gray"
        />
        <SummaryCard
          label={t("valid")}
          value={result.valid_records}
          subtext={`${totalPct.toFixed(1)}%`}
          color="success"
        />
        <SummaryCard
          label={t("invalid")}
          value={result.invalid_records}
          color="error"
        />
        <SummaryCard
          label={t("avg_satisfaction")}
          value={result.satisfaction.average_score.toFixed(2)}
          suffix="/ 5.00"
          color="primary"
        />
      </div>

      {/* Invalid Records Breakdown */}
      {result.invalid_records > 0 && (
        <section className="bg-surface rounded-xl border border-error/30 overflow-hidden">
          <div className="bg-error/10 px-6 py-4 border-b border-error/30">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-error shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              <h2 className="font-semibold text-error">
                {t("invalid_detected_count", { count: result.invalid_records })}
              </h2>
            </div>
            <p className="text-sm text-error mt-1">
              {t("invalid_description")}
            </p>
          </div>
          <div className="p-6">
            <div className="space-y-2">
              {Object.entries(result.invalid_breakdown).map(
                ([rule, count]) => (
                  <div
                    key={rule}
                    className="flex items-center justify-between py-1.5 border-b border-border last:border-0"
                  >
                    <span className="text-sm text-text-primary">{rule}</span>
                    <span className="text-sm font-semibold text-error bg-error/10 px-3 py-0.5 rounded-full">
                      {count}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        </section>
      )}

      {/* Breakdown by Category */}
      <section className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="bg-surface-muted px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-text-primary">
            {t("by_category")}
          </h2>
        </div>
        <div className="p-6">
          <BreakdownTable
            items={Object.entries(result.by_category).map(
              ([name, data]) => ({
                name,
                count: data.count,
                percentage: data.percentage,
              })
            )}
          />
        </div>
      </section>

      {/* Breakdown by Status */}
      <section className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="bg-surface-muted px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-text-primary">
            {t("by_status")}
          </h2>
        </div>
        <div className="p-6">
          <BreakdownTable
            items={Object.entries(result.by_status).map(
              ([name, data]) => ({
                name,
                count: data.count,
                percentage: data.percentage,
              })
            )}
          />
        </div>
      </section>

      {/* Breakdown by Country */}
      <section className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="bg-surface-muted px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-text-primary">
            {t("by_country")}
          </h2>
        </div>
        <div className="p-6">
          <BreakdownTable
            items={Object.entries(result.by_country).map(
              ([name, data]) => ({
                name,
                count: data.count,
                percentage: data.percentage,
              })
            )}
          />
        </div>
      </section>

      {/* Satisfaction Index */}
      <section className="bg-surface rounded-xl border border-border overflow-hidden">
        <div className="bg-surface-muted px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-text-primary">
            {t("satisfaction_index")}
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-primary-100 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-primary-700">
                {result.satisfaction.scored_cases}
              </p>
              <p className="text-xs text-primary-700 mt-1">{t("scored_cases")}</p>
            </div>
            <div className="bg-primary-100 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-primary-700">
                {result.satisfaction.total_closed}
              </p>
              <p className="text-xs text-primary-700 mt-1">{t("total_closed")}</p>
            </div>
            <div className="bg-primary-100 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-primary-700">
                {result.satisfaction.average_score.toFixed(2)}
              </p>
              <p className="text-xs text-primary-700 mt-1">{t("average")} / 5.00</p>
            </div>
          </div>

          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((score) => {
              const dist = result.satisfaction.distribution[String(score)];
              if (!dist) return null;
              const maxCount = Math.max(
                ...Object.values(result.satisfaction.distribution).map(
                  (d) => d.count
                ),
                1
              );
              const barWidth = (dist.count / maxCount) * 100;

              return (
                <div key={score} className="flex items-center gap-3">
                  <span className="text-sm text-text-secondary w-6 shrink-0 text-right font-medium">
                    {score}
                  </span>
                  <div className="flex-1 bg-surface-muted rounded-full h-6 overflow-hidden">
                    <div
                      className="h-full bg-primary-700 rounded-full transition-all duration-500"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <span className="text-sm text-text-primary w-24 text-right">
                    {dist.label}
                  </span>
                  <span className="text-sm font-semibold text-text-primary w-8 text-right">
                    {dist.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Export Button */}
      <div className="flex justify-end">
        <button
          onClick={onExport}
          disabled={exporting}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary-700 text-white font-medium rounded-lg hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          {exporting ? t("exporting") : t("export_csv")}
        </button>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function SummaryCard({
  label,
  value,
  subtext,
  suffix,
  color,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  suffix?: string;
  color: "gray" | "success" | "error" | "primary";
}) {
  const colorClasses: Record<string, string> = {
    gray: "bg-surface-muted border-border text-text-primary",
    success: "bg-success/10 border-success/30 text-success",
    error: "bg-error/10 border-error/30 text-error",
    primary: "bg-primary-100 border-primary-100 text-primary-700",
  };

  return (
    <div className={`rounded-xl border p-5 ${colorClasses[color]}`}>
      <p className="text-sm opacity-75 mb-1">{label}</p>
      <p className="text-3xl font-bold">
        {value}
        {suffix && (
          <span className="text-lg font-normal opacity-60 ml-1">
            {suffix}
          </span>
        )}
      </p>
      {subtext && <p className="text-xs opacity-60 mt-1">{subtext}</p>}
    </div>
  );
}

function BreakdownTable({
  items,
}: {
  items: { name: string; count: number; percentage: number }[];
}) {
  const maxCount = Math.max(...items.map((i) => i.count), 1);

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.name}>
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="font-medium text-text-primary">{item.name}</span>
            <span className="text-text-secondary">
              {item.count}{" "}
              <span className="text-text-secondary/60">
                ({item.percentage}%)
              </span>
            </span>
          </div>
          <div className="w-full bg-surface-muted rounded-full h-2.5 overflow-hidden">
            <div
              className="h-full bg-primary-700 rounded-full transition-all duration-500"
              style={{ width: `${(item.count / maxCount) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}