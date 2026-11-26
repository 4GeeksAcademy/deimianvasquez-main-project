"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ALL_CATEGORIES } from "./types";

import { fetchWithAuth, API_BASE } from "@/services/api";

interface Props {
  onCreated: () => void;
  onCancel: () => void;
  onRefresh: () => void;
}

export default function SupplierForm({ onCreated, onCancel, onRefresh }: Props) {
  const t = useTranslations("suppliers");
  const [form, setForm] = useState({
    name: "",
    country: "USA" as "USA" | "UK",
    categories: [] as string[],
    monthly_rate: "",
    compliance_agreement: "",
    contract_renewal_date: "",
    contact_email: "",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uncertain, setUncertain] = useState(false);

  const toggleCategory = (cat: string) => {
    setForm((prev) => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter((c) => c !== cat)
        : [...prev.categories, cat],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUncertain(false);

    // Validaciones del lado del cliente
    if (!form.name.trim()) {
      setError(t("form_name_required"));
      return;
    }
    if (form.categories.length === 0) {
      setError(t("form_category_required"));
      return;
    }
    const rate = parseFloat(form.monthly_rate);
    if (isNaN(rate) || rate <= 0) {
      setError(t("form_rate_invalid"));
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        country: form.country,
        categories: form.categories,
        monthly_rate: rate,
        currency: form.country === "USA" ? "USD" : "GBP",
        status: "active",
      };

      if (form.compliance_agreement) {
        payload.compliance_agreement = form.compliance_agreement;
      }
      if (form.contract_renewal_date) {
        payload.contract_renewal_date = form.contract_renewal_date;
      }
      if (form.contact_email.trim()) {
        payload.contact_email = form.contact_email.trim();
      }
      if (form.notes.trim()) {
        payload.notes = form.notes.trim();
      }

      const res = await fetchWithAuth(`${API_BASE}/suppliers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        if (res.status === 400 || res.status === 422) {
          const data = await res.json().catch(() => null);
          const fieldLabels: Record<string, string> = {
            "body.name": t("form_name"),
            "body.country": t("form_country"),
            "body.currency": t("form_country"),
            "body.categories": t("form_categories"),
            "body.monthly_rate": t("form_monthly_rate"),
            "body.compliance_agreement": t("form_compliance"),
            "body.contract_renewal_date": t("form_renewal"),
            "body.contact_email": t("form_email"),
            "body.notes": t("form_notes"),
          };
          const fields: string[] = Array.isArray(data?.detail)
            ? data.detail
                .map((item: { field?: unknown } | null) =>
                  typeof item?.field === "string" ? fieldLabels[item.field] : undefined,
                )
                .filter((field: string | undefined): field is string => Boolean(field))
            : [];
          setError(fields.length ? t("error_invalid_fields", { fields: [...new Set(fields)].join(", ") }) : t("error_invalid_input"));
        } else {
          setError(t("error_create_uncertain"));
          setUncertain(true);
        }
        return;
      }

      onCreated();
    } catch {
      setError(t("error_create_uncertain"));
      setUncertain(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-border bg-surface p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-brand-900 mb-4 font-heading">
        {t("form_title")}
      </h2>

      {error && (
        <div role="alert" className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-error">
          <p>{error}</p>
          {uncertain && (
            <button
              type="button"
              onClick={onRefresh}
              className="mt-2 min-h-11 px-3 text-primary-700 hover:text-primary-800 font-medium border border-primary-700 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700"
            >
              {t("retry")}
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Nombre */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-text-primary mb-1">
            {t("form_name")} <span className="text-error">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-700/20"
            placeholder={t("form_name")}
            required
          />
        </div>

        {/* País */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            {t("form_country")} <span className="text-error">*</span>
          </label>
          <select
            value={form.country}
            onChange={(e) => setForm({ ...form, country: e.target.value as "USA" | "UK" })}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-700/20"
          >
            <option value="USA">USA 🇺🇸</option>
            <option value="UK">UK 🇬🇧</option>
          </select>
        </div>

        {/* Tarifa mensual */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            {t("form_monthly_rate")} ({form.country === "USA" ? "USD" : "GBP"}){" "}
            <span className="text-error">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary text-sm">
              {form.country === "USA" ? "$" : "£"}
            </span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={form.monthly_rate}
              onChange={(e) => setForm({ ...form, monthly_rate: e.target.value })}
              className="w-full rounded-lg border border-border pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-700/20"
              placeholder="0.00"
              required
            />
          </div>
        </div>

        {/* Acuerdo de cumplimiento */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            {t("form_compliance")}
          </label>
          <select
            value={form.compliance_agreement}
            onChange={(e) => setForm({ ...form, compliance_agreement: e.target.value })}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-700/20"
          >
            <option value="">{t("form_compliance_none")}</option>
            <option value="BAA">{t("form_compliance_baa")}</option>
            <option value="DPA">{t("form_compliance_dpa")}</option>
            <option value="both">{t("form_compliance_both")}</option>
          </select>
        </div>

        {/* Fecha de renovación */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            {t("form_renewal")}
          </label>
          <input
            type="date"
            value={form.contract_renewal_date}
            onChange={(e) => setForm({ ...form, contract_renewal_date: e.target.value })}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-700/20"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            {t("form_email")}
          </label>
          <input
            type="email"
            value={form.contact_email}
            onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-700/20"
            placeholder={t("form_email_placeholder")}
          />
        </div>

        {/* Categorías */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-text-primary mb-2">
            {t("form_categories")} <span className="text-error">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {ALL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  form.categories.includes(cat)
                    ? "bg-primary-700 text-white border-primary-700"
                    : "bg-surface text-text-secondary border-border hover:border-primary-700 hover:text-primary-700"
                }`}
              >
                {t(`cat_${cat}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Notas */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-text-primary mb-1">
            {t("form_notes")}
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-700/20 resize-none"
            placeholder={t("form_notes_placeholder")}
          />
        </div>
      </div>

      {/* Botones */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-border text-sm text-text-secondary hover:bg-surface-muted transition-colors"
          disabled={saving}
        >
          {t("cancel")}
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-primary-700 text-white text-sm font-medium hover:bg-primary-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? t("form_submitting") : t("form_submit")}
        </button>
      </div>
    </form>
  );
}