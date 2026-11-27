"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { requireAuth } from "@/services/auth-guard";
import { fetchOrders } from "@/services/inventory";
import type { OrderItem } from "@/app/inventory/types";
import Link from "next/link";

export default function OrdersHistoryPage() {
  requireAuth();
  const t = useTranslations("inventory.orders");

  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchOrders();
      setOrders(res.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error_load"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function clinicLabel(id: number): string {
    return t("clinic_label", { id });
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
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
          <h1 className="text-2xl font-bold text-text-primary">{t("title")}</h1>
          <p className="text-sm text-text-secondary mt-1">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/inventory/orders/inbound"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {t("btn_inbound")}
          </Link>
          <Link
            href="/inventory/orders/outbound"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
            </svg>
            {t("btn_outbound")}
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

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 bg-surface-muted rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {/* Orders table */}
      {!loading && !error && (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-surface-muted">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    {t("table_type")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">
                    {t("table_product")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider hidden sm:table-cell">
                    {t("table_quantity")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider hidden md:table-cell">
                    {t("table_detail")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider hidden md:table-cell">
                    {t("table_clinic")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider hidden lg:table-cell">
                    {t("table_date")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-text-secondary">
                      {t("no_orders")}
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={`${order.type}-${order.id}`} className="hover:bg-surface-muted/50 transition-colors">
                      {/* Type badge */}
                      <td className="px-4 py-3">
                        {order.type === "delivery" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {t("badge_inbound")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            {t("badge_outbound")}
                          </span>
                        )}
                      </td>
                      {/* Product */}
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-text-primary">
                          {order.supply_name}
                        </div>
                        <div className="text-xs text-text-secondary font-mono">
                          {order.supply_sku}
                        </div>
                      </td>
                      {/* Quantity */}
                      <td className="px-4 py-3 text-right text-sm font-semibold hidden sm:table-cell">
                        <span
                          className={
                            order.type === "delivery" ? "text-green-600" : "text-red-600"
                          }
                        >
                          {order.type === "delivery" ? "+" : "-"}
                          {order.quantity}
                        </span>
                      </td>
                      {/* Detail (vendor or consumption type) */}
                      <td className="px-4 py-3 text-sm text-text-secondary hidden md:table-cell max-w-45 truncate">
                        {order.type === "delivery"
                          ? order.vendor_or_type
                          : order.vendor_or_type === "clinical_use"
                          ? t("type_clinical_use")
                          : t("type_expiry_waste")}
                      </td>
                      {/* Clinic */}
                      <td className="px-4 py-3 text-sm text-text-secondary hidden md:table-cell">
                        {clinicLabel(order.clinic_id)}
                      </td>
                      {/* Date */}
                      <td className="px-4 py-3 text-sm text-text-secondary hidden lg:table-cell whitespace-nowrap">
                        {formatDate(order.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {orders.length > 0 && (
            <div className="px-4 py-3 border-t border-border bg-surface-muted/50 text-xs text-text-secondary text-right">
              {t("showing", { count: orders.length })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}