"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { forgotPassword } from "@/services/api";
import LanguageSwitcher from "@/app/components/LanguageSwitcher";

export default function ForgotPasswordPage() {
  const t = useTranslations("forgot_password");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSent(false);

    if (!email.trim()) {
      setError(t("email_required"));
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch {
      setError(t("request_failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-surface-muted">
      <div className="w-full max-w-sm mx-4">
        {/* Language Switcher */}
        <div className="flex justify-end mb-4">
          <LanguageSwitcher />
        </div>

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

        {sent ? (
          /* ── Confirmation message ─────────────────────────── */
          <div className="bg-surface rounded-xl border border-border p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-text-primary mb-2">
              {t("check_email")}
            </h2>
            <p className="text-sm text-text-secondary mb-6">
              {t("confirmation")}
            </p>
            <Link
              href="/login"
              className="inline-block w-full py-2.5 rounded-lg bg-primary-700 text-white text-sm font-semibold hover:bg-primary-800 transition-colors text-center"
            >
              {t("back_to_login")}
            </Link>
          </div>
        ) : (
          /* ── Forgot password form ─────────────────────────── */
          <form
            onSubmit={handleSubmit}
            className="bg-surface rounded-xl border border-border p-6"
          >
            {/* Error */}
            {error && (
              <div role="alert" className="mb-4 p-3 bg-error/10 border border-error/30 rounded-lg">
                <p className="text-sm text-error font-medium">{error}</p>
              </div>
            )}

            {/* Email */}
            <div className="mb-4">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-text-secondary mb-1"
              >
                {t("email_label")}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("email_placeholder")}
                autoComplete="email"
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

            {/* Back to login */}
            <div className="mt-4 text-center">
              <Link
                href="/login"
                className="text-xs text-primary-700 hover:text-primary-800 font-medium"
              >
                {t("back_to_login")}
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}