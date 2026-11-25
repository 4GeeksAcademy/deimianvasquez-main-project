"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import SupplierTable from "./SupplierTable";
import SupplierForm from "./SupplierForm";
import type { Supplier } from "./types";
import { fetchWithAuth, API_BASE } from "@/services/api";
import { requireAuth } from "@/services/auth-guard";

export default function SuppliersPage() {
  requireAuth();
  const t = useTranslations("suppliers");

  const CATEGORIES = [
  { value: "", label: t("all_categories") },
  { value: "medical_supplies", label: t("cat_medical_supplies") },
  { value: "laboratory_services", label: t("cat_laboratory_services") },
  { value: "pharmaceutical", label: t("cat_pharmaceutical") },
  { value: "clinical_software", label: t("cat_clinical_software") },
  { value: "it_infrastructure", label: t("cat_it_infrastructure") },
  { value: "hr_and_payroll_software", label: t("cat_hr_and_payroll_software") },
  { value: "cleaning_and_facilities", label: t("cat_cleaning_and_facilities") },
  { value: "patient_communication", label: t("cat_patient_communication") },
  { value: "billing_and_coding_software", label: t("cat_billing_and_coding_software") },
  { value: "training_platforms", label: t("cat_training_platforms") },
];

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countryFilter, setCountryFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [skip, setSkip] = useState(0);
  const limit = 20; // Nº de proveedores por página

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.floor(skip / limit) + 1;

  const fetchSuppliers = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (countryFilter) params.set("country", countryFilter);
      if (categoryFilter) params.set("category", categoryFilter);
      params.set("skip", String(skip));
      params.set("limit", String(limit));

      const url = `${API_BASE}/suppliers${params.toString() ? `?${params}` : ""}`;
      const res = await fetchWithAuth(url);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setSuppliers(data.items);
      setTotal(data.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar proveedores");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, [countryFilter, categoryFilter, skip]);

  const handleCreated = () => {
    setShowForm(false);
    fetchSuppliers();
  };

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-900 font-heading">
            {t("title")}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {t("subtitle")}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-700 text-white text-sm font-medium hover:bg-primary-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {showForm ? t("btn_close") : t("btn_new_supplier")}
        </button>
      </div>

      {/* Formulario de nuevo proveedor */}
      {showForm && (
        <div className="mb-6">
          <SupplierForm onCreated={handleCreated} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <label htmlFor="country" className="text-sm font-medium text-text-secondary">
            {t("filter_country")}
          </label>
          <select
            id="country"
            value={countryFilter}
            onChange={(e) => {
              setCountryFilter(e.target.value);
              setSkip(0);
            }}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-700/20"
          >
            <option value="">{t("filter_all_countries")}</option>
            <option value="USA">USA</option>
            <option value="UK">UK</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="category" className="text-sm font-medium text-text-secondary">
            {t("filter_category")}
          </label>
          <select
            id="category"
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setSkip(0);
            }}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-700/20 min-w-45"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {(countryFilter || categoryFilter) && (
          <button
            onClick={() => {
              setCountryFilter("");
              setCategoryFilter("");
              setSkip(0);
            }}
            className="text-sm text-primary-700 hover:text-primary-800 font-medium"
          >
            {t("filter_clear")}
          </button>
        )}
      </div>

      {/* Tabla */}
      {loading ? (
        <div className="text-center py-12 text-text-secondary">{t("loading")}</div>
      ) : error ? (
        <div className="text-center py-12 text-error">{error}</div>
      ) : suppliers.length === 0 ? (
        <div className="text-center py-12 text-text-secondary">
          {t("no_suppliers")}
        </div>
      ) : (
        <>
          <SupplierTable suppliers={suppliers} onUpdate={fetchSuppliers} />

          {/* Paginación */}
          <div className="flex items-center justify-between mt-4 text-sm text-text-secondary">
            <span>
              {t("pagination_showing", { count: Math.min(limit, total - skip || limit), total })}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSkip(Math.max(0, skip - limit))}
                disabled={skip === 0}
                className="px-3 py-1.5 rounded border border-border bg-surface hover:bg-surface-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {t("pagination_previous")}
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const startPage = Math.max(0, currentPage - 4);
                const pageIdx = startPage + i;
                if (pageIdx >= totalPages) return null;
                return (
                  <button
                    key={pageIdx}
                    onClick={() => setSkip(pageIdx * limit)}
                    className={`px-3 py-1.5 rounded border transition-colors ${
                      pageIdx + 1 === currentPage
                        ? "bg-primary-700 text-white border-primary-700"
                        : "border-border bg-surface hover:bg-surface-muted"
                    }`}
                  >
                    {pageIdx + 1}
                  </button>
                );
              })}
              <button
                onClick={() => setSkip(skip + limit)}
                disabled={skip + limit >= total}
                className="px-3 py-1.5 rounded border border-border bg-surface hover:bg-surface-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {t("pagination_next")}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}