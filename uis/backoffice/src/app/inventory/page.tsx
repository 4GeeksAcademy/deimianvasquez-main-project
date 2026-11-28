"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { requireAuth } from "@/services/auth-guard";
import { fetchProducts, createInboundOrder, createOutboundOrder } from "@/services/inventory";
import type { MedicalSupply } from "@/app/inventory/types";
import { SUPPLY_CATEGORY_LABELS } from "@/app/inventory/types";
import Link from "next/link";

export default function InventoryPage() {
  requireAuth();
  const t = useTranslations("inventory.products");

  const [products, setProducts] = useState<MedicalSupply[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const limit = 20;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);
  const currentPage = useMemo(() => Math.floor(skip / limit) + 1, [skip, limit]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchProducts(skip, limit);
      setProducts(res.items);
      setTotal(res.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar productos");
    } finally {
      setLoading(false);
    }
  }, [skip]);

  // ── Carga inicial y cada vez que cambie skip ──
  useEffect(() => {
    load();
  }, [load]);

  /* ── Color del indicador de stock ─────────────────────────────── */
  function stockColor(stock: number): string {
    if (stock <= 0) return "bg-red-500";
    if (stock < 50) return "bg-yellow-400";
    return "bg-green-500";
  }

  function stockLabel(stock: number): string {
    if (stock <= 0) return t("stock_out");
    if (stock < 50) return t("stock_low");
    return t("stock_ok");
  }

  /* ── Render ───────────────────────────────────────────────────── */
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t("title")}</h1>
          <p className="text-sm text-text-secondary mt-1">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/inventory/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t("btn_new_product")}
          </Link>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-700 text-sm">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
          <button
            onClick={load}
            className="text-sm font-medium text-red-700 hover:text-red-800 underline"
          >
            {t("retry")}
          </button>
        </div>
      )}

      {/* Loading skeleton — réplica visual de la tabla */}
      {loading && (
        <div className="bg-surface border border-border rounded-lg overflow-hidden animate-pulse">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              {/* Header skeleton */}
              <thead className="bg-surface-muted">
                <tr>
                  {["240px", "100px", "140px", "80px", "100px", "140px"].map((w, i) => (
                    <th key={i} className="px-4 py-3">
                      <div
                        className="h-3 bg-gray-200 dark:bg-gray-700 rounded"
                        style={{ width: w }}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              {/* Rows skeleton */}
              <tbody className="divide-y divide-border">
                {Array.from({ length: 5 }).map((_, row) => (
                  <tr key={row}>
                    {/* Product name */}
                    <td className="px-4 py-3">
                      <div className="space-y-1.5">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-36" />
                        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-20 sm:hidden" />
                      </div>
                    </td>
                    {/* SKU */}
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" />
                    </td>
                    {/* Category */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
                    </td>
                    {/* Unit */}
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12" />
                    </td>
                    {/* Stock */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-gray-200 dark:bg-gray-700" />
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-8" />
                      </div>
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <div className="h-7 w-16 bg-gray-200 dark:bg-gray-700 rounded-md" />
                        <div className="h-7 w-16 bg-gray-200 dark:bg-gray-700 rounded-md" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Footer skeleton */}
          <div className="px-4 py-3 border-t border-border bg-surface-muted/50">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-40 ml-auto" />
          </div>
        </div>
      )}

      {/* Products table */}
      {!loading && !error && (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-surface-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    {t("table_product")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider hidden sm:table-cell">
                    SKU
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider hidden md:table-cell">
                    {t("table_category")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider hidden sm:table-cell">
                    {t("table_unit")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    {t("table_stock")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    {t("table_actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <p className="text-sm text-text-secondary mb-3">{t("no_products")}</p>
                      <Link
                        href="/inventory/new"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        {t("no_products_cta")}
                      </Link>
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id} className="hover:bg-surface-muted/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-text-primary">
                          {product.name}
                        </div>
                        <div className="text-xs text-text-secondary sm:hidden">
                          {product.sku}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary hidden sm:table-cell font-mono">
                        {product.sku}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary hidden md:table-cell">
                        {SUPPLY_CATEGORY_LABELS[product.category] ?? product.category}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary hidden sm:table-cell">
                        {product.unit}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-block w-2.5 h-2.5 rounded-full ${stockColor(product.current_stock)}`}
                            title={stockLabel(product.current_stock)}
                          />
                          <span
                            className={`text-sm font-semibold ${
                              product.current_stock <= 0
                                ? "text-red-600"
                                : product.current_stock < 50
                                ? "text-yellow-600"
                                : "text-green-600"
                            }`}
                          >
                            {product.current_stock}
                          </span>
                          <span className="text-xs text-text-secondary">
                            {product.unit}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/inventory/orders/inbound?supply_id=${product.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 transition-colors"
                          >
                            {t("btn_inbound")}
                          </Link>
                          <Link
                            href={`/inventory/orders/outbound?supply_id=${product.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
                          >
                            {t("btn_outbound")}
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {products.length > 0 && (
            <div className="px-4 py-3 border-t border-border bg-surface-muted/50">
              <div className="flex items-center justify-between text-xs text-text-secondary">
                <span>
                  {t("showing", {
                    from: skip + 1,
                    to: Math.min(skip + limit, total),
                    total,
                  })}
                </span>
                {/* Paginación */}
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
                            ? "bg-blue-600 text-white border-blue-600"
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
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-text-secondary">
        <span className="font-medium">{t("legend")}:</span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" />
          {t("stock_ok")} (&ge;50)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-yellow-400" />
          {t("stock_low")} (1–49)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />
          {t("stock_out")} (0)
        </span>
      </div>
    </div>
  );
}