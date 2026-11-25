"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { requireAuth } from "@/services/auth-guard";
import { changePassword } from "@/services/api";

export default function ChangePasswordPage() {
  requireAuth();
  const t = useTranslations("change_password");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!currentPassword) {
      setError(t("current_required"));
      return;
    }

    if (newPassword.length < 6) {
      setError(t("password_min"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t("password_mismatch"));
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("error_prefix")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-surface-muted py-12">
      <div className="w-full max-w-sm mx-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary-700 flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold text-xl">HC</span>
          </div>
          <h1 className="text-2xl font-bold text-brand-900 font-heading">
            {t("title")}
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            {t("subtitle")}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-surface rounded-xl border border-border p-6"
        >
          {/* Success */}
          {success && (
            <div className="mb-4 p-3 bg-success/10 border border-success/30 rounded-lg">
              <p className="text-sm text-success font-medium">{t("success_message")}</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-error/10 border border-error/30 rounded-lg">
              <p className="text-sm text-error font-medium">{error}</p>
            </div>
          )}

          {/* Current Password */}
          <div className="mb-4">
            <label
              htmlFor="current-password"
              className="block text-sm font-medium text-text-secondary mb-1"
            >
              {t("current_password_label")}
            </label>
            <input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder={t("current_password_placeholder")}
              autoComplete="current-password"
              disabled={loading}
              required
              className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-700/20 disabled:opacity-50"
            />
          </div>

          {/* New Password */}
          <div className="mb-4">
            <label
              htmlFor="new-password"
              className="block text-sm font-medium text-text-secondary mb-1"
            >
              {t("new_password_label")}
            </label>
            <input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t("new_password_placeholder")}
              autoComplete="new-password"
              disabled={loading}
              required
              className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-700/20 disabled:opacity-50"
            />
          </div>

          {/* Confirm New Password */}
          <div className="mb-4">
            <label
              htmlFor="confirm-password"
              className="block text-sm font-medium text-text-secondary mb-1"
            >
              {t("confirm_password_label")}
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t("confirm_password_placeholder")}
              autoComplete="new-password"
              disabled={loading}
              required
              className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-700/20 disabled:opacity-50"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-primary-700 text-white text-sm font-semibold hover:bg-primary-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t("submitting") : t("submit")}
          </button>
        </form>
      </div>
    </div>
  );
}