"use client";

import { useState } from "react";
import { CATEGORY_LABELS, ALL_CATEGORIES } from "./types";

const API_BASE = "http://localhost:8000";

interface Props {
  onCreated: () => void;
  onCancel: () => void;
}

export default function SupplierForm({ onCreated, onCancel }: Props) {
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

    // Validaciones del lado del cliente
    if (!form.name.trim()) {
      setError("El nombre del proveedor es requerido");
      return;
    }
    if (form.categories.length === 0) {
      setError("Debes seleccionar al menos una categoría");
      return;
    }
    const rate = parseFloat(form.monthly_rate);
    if (isNaN(rate) || rate <= 0) {
      setError("La tarifa mensual debe ser un número mayor a 0");
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

      const res = await fetch(`${API_BASE}/suppliers`, {
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
          setError(detail || "Error al crear el proveedor");
        }
        return;
      }

      onCreated();
    } catch {
      setError("Error de conexión con el servidor");
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
        Registrar nuevo proveedor
      </h2>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-error">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Nombre */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-text-primary mb-1">
            Nombre del proveedor <span className="text-error">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-700/20"
            placeholder="Ej: Johnson Medical"
            required
          />
        </div>

        {/* País */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            País <span className="text-error">*</span>
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
            Tarifa mensual ({form.country === "USA" ? "USD" : "GBP"}){" "}
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
            Acuerdo de cumplimiento
          </label>
          <select
            value={form.compliance_agreement}
            onChange={(e) => setForm({ ...form, compliance_agreement: e.target.value })}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-700/20"
          >
            <option value="">— No aplica —</option>
            <option value="BAA">BAA (USA)</option>
            <option value="DPA">DPA (UK)</option>
            <option value="both">BAA + DPA</option>
          </select>
        </div>

        {/* Fecha de renovación */}
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1">
            Fecha de renovación
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
            Email de contacto
          </label>
          <input
            type="email"
            value={form.contact_email}
            onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-700/20"
            placeholder="proveedor@ejemplo.com"
          />
        </div>

        {/* Categorías */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-text-primary mb-2">
            Categorías <span className="text-error">*</span>
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
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        </div>

        {/* Notas */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-text-primary mb-1">
            Notas internas
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            rows={2}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-700/20 resize-none"
            placeholder="Observaciones adicionales..."
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
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-primary-700 text-white text-sm font-medium hover:bg-primary-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Guardando..." : "Registrar proveedor"}
        </button>
      </div>
    </form>
  );
}