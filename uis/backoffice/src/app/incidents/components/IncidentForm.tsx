"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  ALL_CATEGORIES,
  ALL_ORIGINS,
  ALL_BRANCHES,
  INCIDENT_CATEGORIES,
  INCIDENT_ORIGINS,
  INCIDENT_BRANCHES,
} from "../types";
import { fetchWithAuth, API_BASE } from "@/services/api";

interface Props {
  onCreated: () => void;
  onCancel: () => void;
}

export default function IncidentForm({ onCreated, onCancel }: Props) {
  const t = useTranslations("incidents");
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    origin: "",
    branch: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (!form.title.trim()) {
      setError(t("form_title_required"));
      return;
    }
    if (!form.description.trim()) {
      setError(t("form_description_required"));
      return;
    }
    if (!form.category) {
      setError(t("form_category_required"));
      return;
    }
    if (!form.origin) {
      setError(t("form_origin_required"));
      return;
    }
    if (!form.branch) {
      setError(t("form_branch_required"));
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        origin: form.origin,
        branch: form.branch,
      };

      const res = await fetchWithAuth(`${API_BASE}/api/incidents/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        const detail = data.detail;
        if (Array.isArray(detail)) {
          setError(detail.map((d: { msg: string }) => d.msg).join(", "));
        } else {
          setError(detail || t("error_create"));
        }
        return;
      }

      onCreated();
    } catch {
      setError(t("error_connection"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-surface rounded-xl border border-border p-6">
      <h2 className="text-lg font-semibold text-brand-900 font-heading mb-4">
        {t("form_title")}
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-error/10 border border-error/30 rounded-lg text-sm text-error">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-text-secondary mb-1">
            {t("form_title_label")}
          </label>
          <input
            id="title"
            type="text"
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder={t("form_title_placeholder")}
            maxLength={255}
            required
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-700/20"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-text-secondary mb-1">
            {t("form_description_label")}
          </label>
          <textarea
            id="description"
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder={t("form_description_placeholder")}
            maxLength={5000}
            rows={4}
            required
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-700/20 resize-y"
          />
        </div>

        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-text-secondary mb-1">
            {t("form_category_label")}
          </label>
          <select
            id="category"
            value={form.category}
            onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
            required
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-700/20"
          >
            <option value="">{t("form_category_select")}</option>
            {ALL_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {INCIDENT_CATEGORIES[cat]}
              </option>
            ))}
          </select>
        </div>

        {/* Origin */}
        <div>
          <label htmlFor="origin" className="block text-sm font-medium text-text-secondary mb-1">
            {t("form_origin_label")}
          </label>
          <select
            id="origin"
            value={form.origin}
            onChange={(e) => setForm((prev) => ({ ...prev, origin: e.target.value }))}
            required
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-700/20"
          >
            <option value="">{t("form_origin_select")}</option>
            {ALL_ORIGINS.map((orig) => (
              <option key={orig} value={orig}>
                {INCIDENT_ORIGINS[orig]}
              </option>
            ))}
          </select>
        </div>

        {/* Branch */}
        <div>
          <label htmlFor="branch" className="block text-sm font-medium text-text-secondary mb-1">
            {t("form_branch_label")}
          </label>
          <select
            id="branch"
            value={form.branch}
            onChange={(e) => setForm((prev) => ({ ...prev, branch: e.target.value }))}
            required
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-700/20"
          >
            <option value="">{t("form_branch_select")}</option>
            {ALL_BRANCHES.map((br) => (
              <option key={br} value={br}>
                {INCIDENT_BRANCHES[br]}
              </option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-700 text-white text-sm font-medium hover:bg-primary-800 transition-colors disabled:opacity-50"
          >
            {saving ? t("form_submitting") : t("form_submit")}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-surface text-sm text-text-secondary hover:bg-surface-muted transition-colors"
          >
            {t("form_cancel")}
          </button>
        </div>
      </form>
    </div>
  );
}