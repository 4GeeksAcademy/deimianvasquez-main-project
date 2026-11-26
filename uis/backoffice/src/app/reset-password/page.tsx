"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { resetPassword } from "@/services/api";
import LanguageSwitcher from "@/app/components/LanguageSwitcher";

function ResetPasswordForm() {
  const t = useTranslations("reset_password");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [token, setToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetFailed, setResetFailed] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const tokenParam = searchParams.get("token");
    if (!tokenParam) {
      setError(t("missing_token"));
      return;
    }
    setToken(tokenParam);
  }, [searchParams, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResetFailed(false);

    if (!token) {
      setError(t("missing_token"));
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
      await resetPassword(token, newPassword);
      setSuccess(true);
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch {
      setError(t("reset_failed"));
      setResetFailed(true);
    } finally {
      setLoading(false);
    }
  };

  if (!token && error) {
    return (
      <div className="bg-surface rounded-xl border border-border p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-error" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-text-primary mb-2">
          {t("invalid_link")}
        </h2>
        <p className="text-sm text-text-secondary mb-6">{error}</p>
        <Link
          href="/forgot-password"
          className="inline-block w-full py-2.5 rounded-lg bg-primary-700 text-white text-sm font-semibold hover:bg-primary-800 transition-colors text-center"
        >
          {t("request_new")}
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="bg-surface rounded-xl border border-border p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-text-primary mb-2">
          {t("success_title")}
        </h2>
        <p className="text-sm text-text-secondary mb-2">
          {t("success_message")}
        </p>
        <p className="text-xs text-text-secondary">
          {t("redirecting")}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-surface rounded-xl border border-border p-6"
    >
      {/* Error */}
      {error && (
        <div role="alert" className="mb-4 p-3 bg-error/10 border border-error/30 rounded-lg">
          <p className="text-sm text-error font-medium">{error}</p>
          {resetFailed && (
            <Link href="/forgot-password" className="mt-2 inline-block text-sm text-primary-700 hover:text-primary-800 underline">
              {t("request_new")}
            </Link>
          )}
        </div>
      )}

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

      {/* Confirm Password */}
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
  );
}

export default function ResetPasswordPage() {
  const t = useTranslations("reset_password");

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

        <Suspense
          fallback={
            <div className="bg-surface rounded-xl border border-border p-6 text-center">
              <p className="text-sm text-text-secondary">{t("loading")}</p>
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}