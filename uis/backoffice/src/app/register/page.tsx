"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { register, login } from "@/services/api";
import LanguageSwitcher from "@/app/components/LanguageSwitcher";

export default function RegisterPage() {
  const t = useTranslations("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (accountCreated) return;
    setError(null);

    if (!name.trim()) {
      setError(t("name_required"));
      return;
    }
    if (!email.trim()) {
      setError(t("email_required"));
      return;
    }
    if (password.length < 6) {
      setError(t("password_min"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("password_mismatch"));
      return;
    }

    setLoading(true);
    let created = false;
    try {
      await register(email.trim(), password, name.trim());
      created = true;
      setAccountCreated(true);
      await login(email.trim(), password);
      window.location.href = "/";
    } catch {
      setError(created ? t("account_created_sign_in") : t("error_register"));
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

        {/* Register Form */}
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

          {/* Name */}
          <div className="mb-4">
            <label
              htmlFor="name"
              className="block text-sm font-medium text-text-secondary mb-1"
            >
              {t("name_label")}
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("name_placeholder")}
              autoComplete="name"
              required
              className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-700/20"
            />
          </div>

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
              required
              className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-700/20"
            />
          </div>

          {/* Password */}
          <div className="mb-4">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-text-secondary mb-1"
            >
              {t("password_label")}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("password_placeholder")}
              autoComplete="new-password"
              required
              className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-700/20"
            />
          </div>

          {/* Confirm password */}
          <div className="mb-4">
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-text-secondary mb-1"
            >
              {t("confirm_password_label")}
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t("confirm_password_placeholder")}
              autoComplete="new-password"
              required
              className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-700/20"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || accountCreated}
            className="w-full py-2.5 rounded-lg bg-primary-700 text-white text-sm font-semibold hover:bg-primary-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t("submitting") : t("submit")}
          </button>

          {/* Login link */}
          <div className="mt-4 text-center">
            <span className="text-xs text-text-secondary">
              {t("has_account")}{" "}
            </span>
            <Link
              href="/login"
              className="text-xs text-primary-700 hover:text-primary-800 font-medium"
            >
              {t("login_link")}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}