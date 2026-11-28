"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import type { IncidentResponse } from "../types";
import {
  INCIDENT_CATEGORIES,
  INCIDENT_ORIGINS,
  INCIDENT_BRANCHES,
} from "../types";
import { fetchWithAuth, API_BASE } from "@/services/api";

const STATUS_ACTIONS: Record<string, string[]> = {
  open: ["in_progress", "discarded"],
  in_progress: ["resolved", "discarded"],
  resolved: [],
  discarded: [],
};

const STATUS_BG: Record<string, string> = {
  open: "bg-yellow/20 text-yellow",
  in_progress: "bg-blue/20 text-blue",
  resolved: "bg-green/20 text-green",
  discarded: "bg-red/20 text-red",
};

export default function IncidentList() {
  const t = useTranslations("incidents");
  const [incidents, setIncidents] = useState<IncidentResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [searchText, setSearchText] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Pagination
  const [skip, setSkip] = useState(0);
  const limit = 20;

  // Expanded row
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [changingStatus, setChangingStatus] = useState<string | null>(null);

  // ── Derived (cached with useMemo — avoids recomputation on every render) ──
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);
  const currentPage = useMemo(() => Math.floor(skip / limit) + 1, [skip, limit]);

  // ── Build query params ──
  const buildParams = () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (searchText.trim()) params.set("search", searchText.trim());
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    params.set("skip", String(skip));
    params.set("limit", String(limit));
    return params;
  };

  // ── Fetch ──
  const fetchIncidents = async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = buildParams().toString();
      const url = `${API_BASE}/api/incidents/${qs ? `?${qs}` : ""}`;
      const res = await fetchWithAuth(url);
      if (!res.ok) throw new Error(t("error_load_list"));
      const data = await res.json();
      setIncidents(data.items);
      setTotal(data.total);
    } catch {
      setError(t("error_load_list"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
    // eslint-disable-next-line react-hooks/rules-hook
  }, [statusFilter, searchText, dateFrom, dateTo, skip]);

  // ── Status change handler ──
  const handleStatusChange = async (id: string, newStatus: string) => {
    setChangingStatus(id);
    setError(null);
    try {
      const res = await fetchWithAuth(
        `${API_BASE}/api/incidents/${id}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        },
      );
      if (!res.ok) throw new Error(t("error_status_update"));
      // Re-fetch to refresh list
      await fetchIncidents();
    } catch {
      setError(t("error_status_update"));
    } finally {
      setChangingStatus(null);
    }
  };

  // ── Toggle expand ──
  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // ── Status options ──
  const STATUS_OPTIONS = [
    { value: "", label: t("filter_all_statuses") },
    { value: "open", label: t("status_open") },
    { value: "in_progress", label: t("status_in_progress") },
    { value: "resolved", label: t("status_resolved") },
    { value: "discarded", label: t("status_discarded") },
  ];

  const labels = (map: Record<string, string>, key: string) =>
    map[key] ?? key;

  return (
    <div>
      {/* ── Filters row ── */}
      <div className="mb-4 space-y-2">
        {/* Row 1: Status + Search + Dates */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col">
            <label
              htmlFor="statusFilter"
              className="text-xs font-medium text-text-secondary mb-1"
            >
              {t("filter_status")}
            </label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setSkip(0);
              }}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-700/20"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label
              htmlFor="searchText"
              className="text-xs font-medium text-text-secondary mb-1"
            >
              {t("filter_search_label")}
            </label>
            <input
              id="searchText"
              type="text"
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setSkip(0);
              }}
              placeholder={t("filter_search_placeholder")}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-700/20"
            />
          </div>

          <div className="flex flex-col">
            <label
              htmlFor="dateFrom"
              className="text-xs font-medium text-text-secondary mb-1"
            >
              {t("filter_date_from")}
            </label>
            <input
              id="dateFrom"
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setSkip(0);
              }}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-700/20"
            />
          </div>

          <div className="flex flex-col">
            <label
              htmlFor="dateTo"
              className="text-xs font-medium text-text-secondary mb-1"
            >
              {t("filter_date_to")}
            </label>
            <input
              id="dateTo"
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setSkip(0);
              }}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-700/20"
            />
          </div>

          <button
            onClick={() => {
              setStatusFilter("");
              setSearchText("");
              setDateFrom("");
              setDateTo("");
              setSkip(0);
            }}
            className="px-3 py-2 text-sm text-primary-700 hover:text-primary-800 font-medium border border-border rounded-lg bg-surface"
          >
            {t("filter_clear")}
          </button>
        </div>
      </div>

      {/* ── Count ── */}
      {!loading && !error && (
        <p className="text-sm text-text-secondary mb-3">
          {t("list_showing", { count: incidents.length, total })}
        </p>
      )}

      {/* ── Error ── */}
      {error && (
        <div role="alert" className="mb-4 p-3 bg-error/10 border border-error/30 rounded-lg text-sm text-error">
          <p>{error}</p>
          <button
            type="button"
            onClick={fetchIncidents}
            className="mt-2 min-h-11 px-3 text-primary-700 hover:text-primary-800 font-medium border border-primary-700 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700"
          >
            {t("list_retry")}
          </button>
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="p-4 text-sm text-text-secondary">{t("list_loading")}</div>
      )}

      {/* ── Empty state ── */}
      {!loading && !error && incidents.length === 0 && (
        <div className="p-8 text-center text-text-secondary">
          <p className="text-base font-medium">{t("list_empty")}</p>
          <p className="text-sm mt-1">{t("list_empty_hint")}</p>
        </div>
      )}

      {/* ═══════════════════════════════════════════
                 TABLE
          ═══════════════════════════════════════════ */}
      {!loading && !error && incidents.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-muted">
                <th className="px-4 py-3 text-left font-medium text-text-secondary">
                  {t("table_title")}
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">
                  {t("table_category")}
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">
                  {t("table_status")}
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">
                  {t("table_origin")}
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">
                  {t("table_branch")}
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">
                  {t("table_created")}
                </th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((inc) => (
                <tr
                  key={inc.id}
                  onClick={() => toggleExpand(inc.id)}
                  className={`border-b border-border cursor-pointer transition-colors ${
                    expandedId === inc.id
                      ? "bg-primary-700/5"
                      : "hover:bg-surface-muted/50"
                  }`}
                >
                  <td className="px-4 py-3 text-text-primary font-medium">
                    {inc.title}
                    <svg
                      className="inline-block w-3 h-3 ml-1.5 text-text-secondary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={
                          expandedId === inc.id
                            ? "M6 4l4 4 2-4 2 4 -2-4 -4"
                            : "M6 4l4 4 2 4 2 -4 -2 4 -4"
                        }
                      />
                    </svg>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {labels(INCIDENT_CATEGORIES, inc.category)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        STATUS_BG[inc.status] ?? ""
                      }`}
                    >
                      {t(`status_${inc.status}`, { default: inc.status })}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {labels(INCIDENT_ORIGINS, inc.origin)}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {labels(INCIDENT_BRANCHES, inc.branch)}
                  </td>
                  <td className="px-4 py-3 text-text-secondary whitespace-nowrap">
                    {inc.created_at.slice(0, 10)}
                  </td>
                </tr>
              ))}
              {/* ── Expanded rows ── */}
              {incidents
                .filter((inc) => expandedId === inc.id)
                .map((inc) => (
                  <tr key={`${inc.id}-expanded`}>
                    <td colSpan={6} className="px-4 py-3 bg-primary-700/5">
                      <div className="flex flex-col gap-2 text-sm">
                        {/* Description */}
                        <p className="text-text-secondary leading-relaxed">
                          {inc.description}
                        </p>

                        {/* Status actions */}
                        {(STATUS_ACTIONS[inc.status]?.length ?? 0) > 0 && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-text-secondary font-medium">
                              {t("list_change_status")}:
                            </span>
                            {STATUS_ACTIONS[inc.status].map((action) => (
                              <button
                                key={action}
                                disabled={changingStatus === inc.id}
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await handleStatusChange(inc.id, action);
                                }}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                                  action === "resolved"
                                    ? "bg-green/20 text-green hover:bg-green/30"
                                    : action === "in_progress"
                                      ? "bg-blue/20 text-blue hover:bg-blue/30"
                                      : "bg-red/20 text-red hover:bg-red/30"
                                } disabled:opacity-40`}
                              >
                                {changingStatus === inc.id
                                  ? "..."
                                  : t(
                                      `action_${action}`,
                                      { default: action },
                                    )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ── */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            disabled={currentPage <= 1}
            onClick={() => setSkip(Math.max(0, skip - limit))}
            className="px-3 py-1.5 rounded-lg border border-border bg-surface text-sm text-text-secondary hover:bg-surface-muted transition-colors disabled:opacity-40"
          >
            {t("pagination_previous")}
          </button>

          <span className="text-sm text-text-secondary">
            {t("pagination_page", { current: currentPage, total: totalPages })}
          </span>

          <button
            disabled={currentPage >= totalPages}
            onClick={() => setSkip(skip + limit)}
            className="px-3 py-1.5 rounded-lg border border-border bg-surface text-sm text-text-secondary hover:bg-surface-muted transition-colors disabled:opacity-40"
          >
            {t("pagination_next")}
          </button>
        </div>
      )}
    </div>
  );
}