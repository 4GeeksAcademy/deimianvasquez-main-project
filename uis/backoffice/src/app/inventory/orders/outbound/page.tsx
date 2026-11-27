"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { requireAuth } from "@/services/auth-guard";
import { fetchProducts, createOutboundOrder } from "@/services/inventory";
import type { MedicalSupply, ConsumptionType } from "@/app/inventory/types";
import { CONSUMPTION_TYPE_LABELS } from "@/app/inventory/types";
import Link from "next/link";

export default function OutboundOrderPage() {
  requireAuth();
  const t = useTranslations("inventory.outbound");
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedId = searchParams.get("supply_id");

  const [products, setProducts] = useState<MedicalSupply[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);

  /* ── Form state ──────────────────────────────────────────────── */
  const [supplyId, setSupplyId] = useState<number | "">(
    preselectedId ? Number(preselectedId) : ""
  );
  const [quantity, setQuantity] = useState("");
  const [consumptionType, setConsumptionType] = useState<ConsumptionType | "">("");
  const [clinicId, setClinicId] = useState<number | "">("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  /* ── Load products for dropdown ──────────────────────────────── */
  const loadProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const res = await fetchProducts();
      setProducts(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error_load_products"));
    } finally {
      setProductsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  /* ── Selected product & stock validation ─────────────────────── */
  const selectedProduct = products.find((p) => p.id === supplyId);
  const qty = parseInt(quantity, 10);
  const exceedsStock = selectedProduct && qty > selectedProduct.current_stock;

  /* ── Submit ──────────────────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving || success) return;

    setError(null);
    setFieldErrors({});

    // Client‑side validation
    const errs: Record<string, string> = {};
    if (supplyId === "") errs.supply_id = t("field_product_required");
    if (!qty || qty <= 0) errs.quantity = t("field_quantity_invalid");
    if (consumptionType === "") errs.consumption_type = t("field_type_required");
    if (clinicId === "" || clinicId < 1 || clinicId > 12) errs.clinic_id = t("field_clinic_invalid");
    if (exceedsStock) errs.quantity = t("field_quantity_exceeds", { available: selectedProduct!.current_stock });

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setSaving(true);
    try {
      await createOutboundOrder({
        supply_id: supplyId as number,
        quantity: qty,
        consumption_type: consumptionType as ConsumptionType,
        clinic_id: clinicId as number,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error_create"));
    } finally {
      setSaving(false);
    }
  };

  /* ── Success screen ──────────────────────────────────────────── */
  if (success) {
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
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => { setSuccess(false); setQuantity(""); setConsumptionType(""); setClinicId(""); }}
              className="px-4 py-2 text-sm font-medium bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors"
            >
              {t("btn_another")}
            </button>
            <Link
              href="/inventory"
              className="px-4 py-2 text-sm font-medium text-text-secondary border border-border rounded-lg hover:bg-surface-muted transition-colors"
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
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/inventory"
          className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary mb-4 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t("btn_back")}
        </Link>
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

      <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-lg p-6 space-y-5">
        {/* Product */}
        <div>
          <label htmlFor="supply_id" className="block text-sm font-medium text-text-primary mb-1.5">
            {t("field_product")} <span className="text-red-500">*</span>
          </label>
          {productsLoading ? (
            <div className="h-10 bg-surface-muted rounded-lg animate-pulse" />
          ) : (
            <select
              id="supply_id"
              value={supplyId}
              onChange={(e) => {
                setSupplyId(e.target.value ? Number(e.target.value) : "");
                setFieldErrors((prev) => ({ ...prev, supply_id: "" }));
              }}
              className={`w-full px-3 py-2 border rounded-lg text-sm bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                fieldErrors.supply_id ? "border-red-400" : "border-border"
              }`}
              required
            >
              <option value="">{t("field_product_placeholder")}</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </select>
          )}
          {/* Reactive stock display */}
          {selectedProduct && (
            <p
              className={`mt-1.5 text-xs ${
                selectedProduct.current_stock <= 0
                  ? "text-red-600 font-medium"
                  : selectedProduct.current_stock < 50
                  ? "text-yellow-600 font-medium"
                  : "text-text-secondary"
              }`}
            >
              {t("current_stock")}: <span className="font-semibold">{selectedProduct.current_stock}</span>
              {" "}{selectedProduct.unit}
            </p>
          )}
          {fieldErrors.supply_id && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.supply_id}</p>
          )}
        </div>

        {/* Quantity */}
        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-text-primary mb-1.5">
            {t("field_quantity")} <span className="text-red-500">*</span>
          </label>
          <input
            id="quantity"
            type="number"
            min={1}
            max={selectedProduct?.current_stock ?? undefined}
            value={quantity}
            onChange={(e) => {
              setQuantity(e.target.value);
              setFieldErrors((prev) => ({ ...prev, quantity: "" }));
            }}
            placeholder={t("field_quantity_placeholder")}
            className={`w-full px-3 py-2 border rounded-lg text-sm bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
              fieldErrors.quantity || exceedsStock ? "border-red-400" : "border-border"
            }`}
            required
          />
          {/* Visual hint for stock limit */}
          {selectedProduct && qty > selectedProduct.current_stock && (
            <p className="mt-1 text-xs text-red-600">
              {t("field_quantity_exceeds", { available: selectedProduct.current_stock })}
            </p>
          )}
          {fieldErrors.quantity && !exceedsStock && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.quantity}</p>
          )}
        </div>

        {/* Consumption type */}
        <div>
          <label htmlFor="consumption_type" className="block text-sm font-medium text-text-primary mb-1.5">
            {t("field_type")} <span className="text-red-500">*</span>
          </label>
          <select
            id="consumption_type"
            value={consumptionType}
            onChange={(e) => {
              setConsumptionType(e.target.value as ConsumptionType | "");
              setFieldErrors((prev) => ({ ...prev, consumption_type: "" }));
            }}
            className={`w-full px-3 py-2 border rounded-lg text-sm bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
              fieldErrors.consumption_type ? "border-red-400" : "border-border"
            }`}
            required
          >
            <option value="">{t("field_type_placeholder")}</option>
            {(Object.entries(CONSUMPTION_TYPE_LABELS) as [ConsumptionType, string][]).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              )
            )}
          </select>
          {fieldErrors.consumption_type && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.consumption_type}</p>
          )}
        </div>

        {/* Clinic */}
        <div>
          <label htmlFor="clinic_id" className="block text-sm font-medium text-text-primary mb-1.5">
            {t("field_clinic")} <span className="text-red-500">*</span>
          </label>
          <select
            id="clinic_id"
            value={clinicId}
            onChange={(e) => {
              setClinicId(e.target.value ? Number(e.target.value) : "");
              setFieldErrors((prev) => ({ ...prev, clinic_id: "" }));
            }}
            className={`w-full px-3 py-2 border rounded-lg text-sm bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
              fieldErrors.clinic_id ? "border-red-400" : "border-border"
            }`}
            required
          >
            <option value="">{t("field_clinic_placeholder")}</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((id) => (
              <option key={id} value={id}>
                {t("clinic_label", { id })}
              </option>
            ))}
          </select>
          {fieldErrors.clinic_id && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.clinic_id}</p>
          )}
        </div>

        {/* Stock summary */}
        {selectedProduct && qty > 0 && (
          <div className="p-3 bg-surface-muted rounded-lg text-sm">
            <p className="text-text-secondary">
              {t("stock_after")}:{" "}
              <span
                className={`font-semibold ${
                  selectedProduct.current_stock - qty < 0
                    ? "text-red-600"
                    : selectedProduct.current_stock - qty < 50
                    ? "text-yellow-600"
                    : "text-green-600"
                }`}
              >
                {selectedProduct.current_stock - qty}
              </span>
              {" "}{selectedProduct.unit}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/inventory"
            className="px-4 py-2 text-sm font-medium text-text-secondary border border-border rounded-lg hover:bg-surface-muted transition-colors"
          >
            {t("btn_cancel")}
          </Link>
          <button
            type="submit"
            disabled={saving || productsLoading || (!!selectedProduct && qty > selectedProduct.current_stock)}
            className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? t("btn_submitting") : t("btn_submit")}
          </button>
        </div>
      </form>
    </div>
  );
}