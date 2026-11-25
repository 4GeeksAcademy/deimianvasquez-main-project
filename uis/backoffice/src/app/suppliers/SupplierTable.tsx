"use client";

import { useState } from "react";
import type { Supplier } from "./types";
import { CATEGORY_LABELS } from "./types";

import { fetchWithAuth, API_BASE } from "@/services/api";

interface Props {
  suppliers: Supplier[];
  onUpdate: () => void;
}

export default function SupplierTable({ suppliers, onUpdate }: Props) {
  const [editingRate, setEditingRate] = useState<number | null>(null);
  const [newRate, setNewRate] = useState("");

  const handleStatusToggle = async (supplier: Supplier) => {
    const newStatus = supplier.status === "active" ? "suspended" : "active";
    try {
      const res = await fetchWithAuth(`${API_BASE}/suppliers/${supplier.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(`Error: ${data.detail || "No se pudo cambiar el estado"}`);
        return;
      }
      onUpdate();
    } catch {
      alert("Error de conexión con el servidor");
    }
  };

  const handleRateUpdate = async (id: number) => {
    const rate = parseFloat(newRate);
    if (isNaN(rate) || rate <= 0) {
      alert("La tarifa debe ser un número mayor a 0");
      return;
    }
    try {
      const res = await fetchWithAuth(`${API_BASE}/suppliers/${id}/rate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthly_rate: rate }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(`Error: ${data.detail || "No se pudo actualizar la tarifa"}`);
        return;
      }
      setEditingRate(null);
      setNewRate("");
      onUpdate();
    } catch {
      alert("Error de conexión con el servidor");
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    const symbol = currency === "USD" ? "$" : "£";
    return `${symbol}${amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface-muted border-b border-border">
            <th className="text-left px-4 py-3 font-semibold text-text-primary">Proveedor</th>
            <th className="text-left px-4 py-3 font-semibold text-text-primary">País</th>
            <th className="text-left px-4 py-3 font-semibold text-text-primary">Categorías</th>
            <th className="text-right px-4 py-3 font-semibold text-text-primary">Tarifa mensual</th>
            <th className="text-center px-4 py-3 font-semibold text-text-primary">Estado</th>
            <th className="text-center px-4 py-3 font-semibold text-text-primary">Cumplimiento</th>
            <th className="text-center px-4 py-3 font-semibold text-text-primary">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {suppliers.map((supplier) => (
            <tr
              key={supplier.id}
              className={`hover:bg-surface-muted/50 transition-colors ${
                supplier.status === "suspended" ? "opacity-70" : ""
              }`}
            >
              <td className="px-4 py-3">
                <div>
                  <div className="font-medium text-text-primary">{supplier.name}</div>
                  {supplier.contact_email && (
                    <div className="text-xs text-text-secondary">{supplier.contact_email}</div>
                  )}
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-1">
                  <span className={`text-xs font-bold ${supplier.country === "USA" ? "text-primary-700" : "text-brand-800"}`}>
                    {supplier.country === "USA" ? "🇺🇸" : "🇬🇧"}
                  </span>
                  {supplier.country}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {supplier.categories.map((cat) => (
                    <span
                      key={cat}
                      className="inline-block px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 text-xs font-medium"
                    >
                      {CATEGORY_LABELS[cat] || cat}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 text-right">
                {editingRate === supplier.id ? (
                  <div className="flex items-center justify-end gap-2">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={newRate}
                      onChange={(e) => setNewRate(e.target.value)}
                      className="w-24 rounded border border-border px-2 py-1 text-right text-sm focus:outline-none focus:ring-2 focus:ring-primary-700/20"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRateUpdate(supplier.id);
                        if (e.key === "Escape") {
                          setEditingRate(null);
                          setNewRate("");
                        }
                      }}
                    />
                    <button
                      onClick={() => handleRateUpdate(supplier.id)}
                      className="text-xs px-2 py-1 rounded bg-primary-700 text-white hover:bg-primary-800 transition-colors"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => {
                        setEditingRate(null);
                        setNewRate("");
                      }}
                      className="text-xs px-2 py-1 rounded border border-border text-text-secondary hover:bg-surface-muted transition-colors"
                    >
                      ✗
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditingRate(supplier.id);
                      setNewRate(supplier.monthly_rate.toString());
                    }}
                    className="hover:text-primary-700 transition-colors cursor-pointer"
                    title="Editar tarifa"
                  >
                    <span className="font-mono font-medium">
                      {formatCurrency(supplier.monthly_rate, supplier.currency)}
                    </span>
                    <span className="ml-1 text-xs text-text-secondary">/{supplier.currency === "USD" ? "mes" : "mes"}</span>
                  </button>
                )}
              </td>
              <td className="px-4 py-3 text-center">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                    supplier.status === "active"
                      ? "bg-green-100 text-success"
                      : "bg-red-100 text-error"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      supplier.status === "active" ? "bg-success" : "bg-error"
                    }`}
                  />
                  {supplier.status === "active" ? "Activo" : "Suspendido"}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                {supplier.compliance_agreement ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-border text-xs font-medium text-text-secondary">
                    {supplier.compliance_agreement === "both"
                      ? "BAA + DPA"
                      : supplier.compliance_agreement}
                  </span>
                ) : (
                  <span className="text-xs text-text-secondary">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-center">
                <button
                  onClick={() => handleStatusToggle(supplier)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    supplier.status === "active"
                      ? "bg-red-50 text-error hover:bg-red-100 border border-red-200"
                      : "bg-green-50 text-success hover:bg-green-100 border border-green-200"
                  }`}
                  title={supplier.status === "active" ? "Suspender proveedor" : "Activar proveedor"}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {supplier.status === "active" ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    )}
                  </svg>
                  {supplier.status === "active" ? "Suspender" : "Activar"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}