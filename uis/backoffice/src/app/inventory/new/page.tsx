"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { requireAuth } from "@/services/auth-guard";
import { createProduct } from "@/services/inventory";
import { SUPPLY_CATEGORY_LABELS } from "@/app/inventory/types";
import type { SupplyCategory } from "@/app/inventory/types";
import Link from "next/link";

const CATEGORIES = Object.keys(SUPPLY_CATEGORY_LABELS) as SupplyCategory[];

export default function NewProductPage() {
  requireAuth();
  const t = useTranslations("inventory.new_product");
  const router = useRouter();

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [category, setCategory] = useState<SupplyCategory | "">("");
  const [unit, setUnit] = useState("");
  const [country, setCountry] = useState<"US" | "UK" | "">("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [createdId, setCreatedId] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || createdId !== null) return;

    setError(null);

    if (!name.trim()) {
      setError(t("field_name_required"));
      return;
    }
    if (!sku.trim()) {
      setError(t("field_sku_required"));
      return;
    }
    if (!category) {
      setError(t("field_category_required"));
      return;
    }
    if (!unit.trim()) {
      setError(t("field_unit_required"));
      return;
    }
    if (!country) {
      setError(t("field_country_required"));
      return;
    }

    setSaving(true);
    try {
      const product = await createProduct({
        name: name.trim(),
        sku: sku.trim(),
        category,
        unit: unit.trim(),
        country,
      });
      setCreatedId(product.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error_create"));
    } finally {
      setSaving(false);
    }
  };

  /* ── Success screen ──────────────────────────────────────────── */
  if (createdId !== null) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-surface border border-border rounded-lg p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">{t("success_title")}</h2>
          <p className="text-sm text-text-secondary mb-6">{t("success_desc")}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={`/inventory/orders/inbound?supply_id=${createdId}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors"
            >
              {t("btn_inbound")}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              href="/inventory/new"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-text-primary text-sm font-medium hover:bg-surface-muted transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t("btn_another")}
            </Link>
            <Link
              href="/inventory"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-text-primary text-sm font-medium hover:bg-surface-muted transition-colors"
            >
              {t("btn_back")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ── Form ────────────────────────────────────────────────────── */
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/inventory"
          className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t("btn_back")}
        </Link>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">{t("title")}</h1>
        <p className="text-sm text-text-secondary mt-1">{t("subtitle")}</p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-lg p-6 space-y-5">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            {t("field_name")} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("field_name_placeholder")}
            className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary text-sm placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        {/* SKU + Category row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              SKU <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder={t("field_sku_placeholder")}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary text-sm placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              {t("field_category")} <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as SupplyCategory)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="">{t("field_category_placeholder")}</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {SUPPLY_CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Unit + Country row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              {t("field_unit")} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder={t("field_unit_placeholder")}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary text-sm placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1.5">
              {t("field_country")} <span className="text-red-500">*</span>
            </label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value as "US" | "UK")}
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="">{t("field_country_placeholder")}</option>
              <option value="US">{t("field_country_us")}</option>
              <option value="UK">{t("field_country_uk")}</option>
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/inventory"
            className="px-4 py-2 rounded-lg border border-border text-text-primary text-sm font-medium hover:bg-surface-muted transition-colors"
          >
            {t("btn_cancel")}
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? t("btn_submitting") : t("btn_submit")}
          </button>
        </div>
      </form>
    </div>
  );
}