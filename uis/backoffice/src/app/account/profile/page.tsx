"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { requireAuth } from "@/services/auth-guard";
import {
  getCachedUser,
  fetchMe,
  updateProfile,
} from "@/services/api";
import type { CurrentUser } from "@/services/api";

export default function ProfilePage() {
  requireAuth();
  const t = useTranslations("profile");

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);
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
          setError(t("error_load"));
        })
        .finally(() => setLoading(false));
    }
  }, []);

  const handleSave = async () => {
    setError(null);
    setSuccess(null);
    setSaving(true);

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
      setSuccess(t("save_success"));
    } catch {
      setError(t("error_update"));
    } finally {
      setSaving(false);
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
        <p className="text-sm text-text-secondary">{t("loading")}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-64">
        <div className="bg-surface rounded-xl border border-border p-6 max-w-md text-center">
          <h1 className="text-xl font-bold text-error">{t("error_title")}</h1>
          <p className="text-sm text-text-secondary mt-2">
            {error || t("error_no_user")}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 min-h-11 px-3 text-primary-700 hover:text-primary-800 font-medium border border-primary-700 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700"
          >
            {t("retry")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 px-4 sm:px-6 lg:px-8 py-8 max-w-2xl mx-auto w-full">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-900 font-heading">
          {t("title")}
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          {t("subtitle")}
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
            {t("email_label")}
          </label>
          <p className="text-sm text-text-primary">{user.email}</p>
        </div>

        {/* Role (read-only) */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-text-secondary mb-1">
            {t("role_label")}
          </label>
          <p className="text-sm text-text-primary">
            {user.role === "admin"
              ? t("role_admin")
              : user.role === "manager"
                ? t("role_manager")
                : t("role_user")}
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
                {t("name_label")}
              </label>
              <input
                id="profile-name"
                type="text"
                disabled={saving}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("name_placeholder")}
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
                {t("phone_label")}
              </label>
              <input
                id="profile-phone"
                type="tel"
                disabled={saving}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t("phone_placeholder")}
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
                {t("address_label")}
              </label>
              <input
                id="profile-address"
                type="text"
                disabled={saving}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t("address_placeholder")}
                maxLength={255}
                className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-700/20"
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-primary-700 text-white text-sm font-medium hover:bg-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? t("saving") : t("save")}
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="px-4 py-2 rounded-lg border border-border text-text-secondary text-sm font-medium hover:bg-surface-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t("cancel")}
              </button>
            </div>
          </>
        ) : (
          /* ── View mode ────────────────────────────────────── */
          <>
            {/* Name */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-text-secondary mb-1">
                {t("name_label")}
              </label>
              <p className="text-sm text-text-primary">
                {user.profile?.name || (
                  <span className="italic text-text-secondary">{t("not_specified")}</span>
                )}
              </p>
            </div>

            {/* Phone */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-text-secondary mb-1">
                {t("phone_label")}
              </label>
              <p className="text-sm text-text-primary">
                {user.profile?.phone || (
                  <span className="italic text-text-secondary">{t("not_specified")}</span>
                )}
              </p>
            </div>

            {/* Address */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-text-secondary mb-1">
                {t("address_label")}
              </label>
              <p className="text-sm text-text-primary">
                {user.profile?.address || (
                  <span className="italic text-text-secondary">{t("not_specified")}</span>
                )}
              </p>
            </div>

            {/* Edit button */}
            <button
              onClick={() => setEditing(true)}
              className="mt-2 px-4 py-2 rounded-lg bg-primary-700 text-white text-sm font-medium hover:bg-primary-800 transition-colors"
            >
              {t("edit")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}