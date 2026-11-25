"use client";

import { useEffect, useState } from "react";
import { requireAuth } from "@/services/auth-guard";
import {
  getCachedUser,
  fetchMe,
  updateProfile,
} from "@/services/api";
import type { CurrentUser } from "@/services/api";

export default function ProfilePage() {
  requireAuth();

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [editing, setEditing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Edit form fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    const cached = getCachedUser();
    if (cached) {
      setUser(cached);
      setName(cached.profile?.name || "");
      setPhone(cached.profile?.phone || "");
      setAddress(cached.profile?.address || "");
      setLoading(false);
    } else {
      fetchMe()
        .then((u) => {
          setUser(u);
          setName(u.profile?.name || "");
          setPhone(u.profile?.phone || "");
          setAddress(u.profile?.address || "");
        })
        .catch(() => {
          setError("No se pudo cargar la información del perfil.");
        })
        .finally(() => setLoading(false));
    }
  }, []);

  const handleSave = async () => {
    setError(null);
    setSuccess(null);

    try {
      const updated = await updateProfile({
        name: name.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
      });
      setUser(updated);
      setName(updated.profile?.name || "");
      setPhone(updated.profile?.phone || "");
      setAddress(updated.profile?.address || "");
      setEditing(false);
      setSuccess("Perfil actualizado correctamente.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al actualizar el perfil"
      );
    }
  };

  const handleCancel = () => {
    setError(null);
    setSuccess(null);
    // Restore original values
    if (user) {
      setName(user.profile?.name || "");
      setPhone(user.profile?.phone || "");
      setAddress(user.profile?.address || "");
    }
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-64">
        <p className="text-sm text-text-secondary">Cargando perfil...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-64">
        <div className="bg-surface rounded-xl border border-border p-6 max-w-md text-center">
          <h1 className="text-xl font-bold text-error">Error</h1>
          <p className="text-sm text-text-secondary mt-2">
            {error || "No se pudo cargar la información del usuario."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 px-4 sm:px-6 lg:px-8 py-8 max-w-2xl mx-auto w-full">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-900 font-heading">
          Mi Perfil
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Administra tu información personal
        </p>
      </div>

      {/* Success message */}
      {success && (
        <div className="mb-4 p-3 bg-success/10 border border-success/30 rounded-lg">
          <p className="text-sm text-success font-medium">{success}</p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-error/10 border border-error/30 rounded-lg">
          <p className="text-sm text-error font-medium">{error}</p>
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-surface rounded-xl border border-border p-6">
        {/* Email (read-only) */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-text-secondary mb-1">
            Correo electrónico
          </label>
          <p className="text-sm text-text-primary">{user.email}</p>
        </div>

        {/* Role (read-only) */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-text-secondary mb-1">
            Rol
          </label>
          <p className="text-sm text-text-primary">
            {user.role === "admin"
              ? "Administrador"
              : user.role === "manager"
                ? "Gestor"
                : "Usuario"}
          </p>
        </div>

        <hr className="border-border my-5" />

        {editing ? (
          /* ── Edit mode ───────────────────────────────────── */
          <>
            {/* Name */}
            <div className="mb-4">
              <label
                htmlFor="profile-name"
                className="block text-sm font-medium text-text-secondary mb-1"
              >
                Nombre
              </label>
              <input
                id="profile-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre completo"
                maxLength={100}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-700/20"
              />
            </div>

            {/* Phone */}
            <div className="mb-4">
              <label
                htmlFor="profile-phone"
                className="block text-sm font-medium text-text-secondary mb-1"
              >
                Teléfono
              </label>
              <input
                id="profile-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ej: +34 600 123 456"
                maxLength={30}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-700/20"
              />
            </div>

            {/* Address */}
            <div className="mb-4">
              <label
                htmlFor="profile-address"
                className="block text-sm font-medium text-text-secondary mb-1"
              >
                Dirección
              </label>
              <input
                id="profile-address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ej: Calle Principal 123, Ciudad"
                maxLength={255}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-700/20"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-lg bg-primary-700 text-white text-sm font-medium hover:bg-primary-800 transition-colors"
              >
                Guardar cambios
              </button>
              <button
                onClick={handleCancel}
                className="px-4 py-2 rounded-lg border border-border text-text-secondary text-sm font-medium hover:bg-surface-muted transition-colors"
              >
                Cancelar
              </button>
            </div>
          </>
        ) : (
          /* ── View mode ────────────────────────────────────── */
          <>
            {/* Name */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Nombre
              </label>
              <p className="text-sm text-text-primary">
                {user.profile?.name || (
                  <span className="italic text-text-secondary">No especificado</span>
                )}
              </p>
            </div>

            {/* Phone */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Teléfono
              </label>
              <p className="text-sm text-text-primary">
                {user.profile?.phone || (
                  <span className="italic text-text-secondary">No especificado</span>
                )}
              </p>
            </div>

            {/* Address */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Dirección
              </label>
              <p className="text-sm text-text-primary">
                {user.profile?.address || (
                  <span className="italic text-text-secondary">No especificado</span>
                )}
              </p>
            </div>

            {/* Edit button */}
            <button
              onClick={() => setEditing(true)}
              className="mt-2 px-4 py-2 rounded-lg bg-primary-700 text-white text-sm font-medium hover:bg-primary-800 transition-colors"
            >
              Editar perfil
            </button>
          </>
        )}
      </div>
    </div>
  );
}