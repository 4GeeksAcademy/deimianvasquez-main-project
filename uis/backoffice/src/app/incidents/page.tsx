"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import FileUpload from "./components/FileUpload";
import ResultsPanel from "./components/ResultsPanel";
import IncidentForm from "./components/IncidentForm";
import IncidentList from "./components/IncidentList";
import IncidentSummaryPanel from "./components/IncidentSummaryPanel";
import type { AnalysisResult } from "./types";
import { fetchWithAuth, API_BASE } from "@/services/api";
import { requireAuth } from "@/services/auth-guard";

type Tab = "analyze" | "register" | "list" | "summary";

export default function IncidentsPage() {
  const t = useTranslations("incidents");
  requireAuth();
  const [activeTab, setActiveTab] = useState<Tab>("analyze");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [lastFile, setLastFile] = useState<File | null>(null);
  const [errorAction, setErrorAction] = useState<"upload" | "export" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = useCallback(async (file: File) => {
    setLastFile(file);
    setLoading(true);
    setError(null);
    setErrorAction(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetchWithAuth(`${API_BASE}/api/incidents/analyze`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error(t("error_unknown"));

      const data: AnalysisResult = await response.json();
      setResult(data);
    } catch {
      setError(t("error_unknown"));
      setErrorAction("upload");
    } finally {
      setLoading(false);
    }
  }, [t]);

  const handleExport = useCallback(async () => {
    setExporting(true);
    setError(null);
    setErrorAction(null);
    try {
      const response = await fetchWithAuth(`${API_BASE}/api/incidents/results/export`);
      if (!response.ok) throw new Error(t("error_export"));

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "incidents-analysis-report.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      setError(t("error_download"));
      setErrorAction("export");
    } finally {
      setExporting(false);
    }
  }, [t]);

  const handleIncidentCreated = useCallback(() => {
    setActiveTab("list");
  }, []);

  const TABS: { key: Tab; label: string }[] = [
    { key: "analyze", label: t("tab_analyze") },
    { key: "register", label: t("tab_register") },
    { key: "list", label: t("tab_list") },
    { key: "summary", label: t("tab_summary") },
  ];

  return (
    <div className="flex-1 flex flex-col">
      {/* Page Header */}
      <div className="bg-surface border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div>
            <h1 className="text-2xl font-bold text-brand-900 font-heading">
              {t("title")}
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              {t("subtitle")}
            </p>
          </div>
          {/* Tabs */}
          <div className="flex gap-1 mt-4 border-b border-border">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setError(null);
                }}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                  activeTab === tab.key
                    ? "bg-surface border border-border border-b-transparent text-primary-700"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab: Analyze */}
        {activeTab === "analyze" && (
          <>
            {/* File Upload Section */}
            <section className="mb-8">
              <FileUpload onFileUpload={handleFileUpload} loading={loading} />
            </section>

            {/* Error Display */}
            {error && (
              <div className="mb-8 p-4 bg-error/10 border border-error/30 rounded-xl">
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-error mt-0.5 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <h3 className="font-medium text-error">{t("error_prefix")}</h3>
                    <p className="text-sm text-error mt-1">{error}</p>
                    <button
                      type="button"
                      onClick={() => {
                        if (errorAction === "upload" && lastFile) {
                          handleFileUpload(lastFile);
                        } else if (errorAction === "export") {
                          handleExport();
                        }
                      }}
                      className="mt-2 min-h-11 px-3 text-primary-700 hover:text-primary-800 font-medium border border-primary-700 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700"
                    >
                      {t("retry_action")}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Results Panel */}
            {result && (
              <ResultsPanel result={result} onExport={handleExport} exporting={exporting} />
            )}
          </>
        )}

        {/* Tab: Register */}
        {activeTab === "register" && (
          <IncidentForm
            onCreated={handleIncidentCreated}
            onCancel={() => setActiveTab("list")}
          />
        )}

        {/* Tab: List */}
        {activeTab === "list" && <IncidentList />}

        {/* Tab: Summary */}
        {activeTab === "summary" && <IncidentSummaryPanel />}
      </main>
    </div>
  );
}