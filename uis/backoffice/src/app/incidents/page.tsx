"use client";

import { useState, useCallback } from "react";
import FileUpload from "./components/FileUpload";
import ResultsPanel from "./components/ResultsPanel";
import type { AnalysisResult } from "./types";
import { fetchWithAuth, API_BASE } from "@/services/api";
import { requireAuth } from "@/services/auth-guard";

export default function IncidentsPage() {
  requireAuth();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetchWithAuth(`${API_BASE}/api/incidents/analyze`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(
          errData?.detail || `Error del servidor: ${response.status}`
        );
      }

      const data: AnalysisResult = await response.json();
      setResult(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error desconocido al procesar el archivo"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const handleExport = useCallback(async () => {
    try {
      const response = await fetchWithAuth(`${API_BASE}/api/incidents/results/export`);
      if (!response.ok) throw new Error("Error al exportar resultados");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "incidents-analysis-report.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al descargar el CSV"
      );
    }
  }, []);

  return (
    <div className="flex-1 flex flex-col">
      {/* Page Header */}
      <div className="bg-surface border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div>
            <h1 className="text-2xl font-bold text-brand-900 font-heading">
              Análisis de Incidentes
            </h1>
            <p className="text-sm text-text-secondary mt-0.5">
              Carga un archivo CSV para validar registros y visualizar métricas
            </p>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                <h3 className="font-medium text-error">Error</h3>
                <p className="text-sm text-error mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Results Panel */}
        {result && (
          <ResultsPanel result={result} onExport={handleExport} />
        )}
      </main>
    </div>
  );
}