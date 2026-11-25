"use client";

import { useState } from "react";
import Link from "next/link";
import { login } from "@/services/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("El correo electrónico es requerido");
      return;
    }
    if (!password) {
      setError("La contraseña es requerida");
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
      // Login successful — redirect to home
      window.location.href = "/";
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Error al iniciar sesión"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-surface-muted">
      <div className="w-full max-w-sm mx-4">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary-700 flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold text-xl">HC</span>
          </div>
          <h1 className="text-2xl font-bold text-brand-900 font-heading">
            Iniciar sesión
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Ingresa a tu cuenta de HealthCore
          </p>
        </div>

        {/* Login Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-surface rounded-xl border border-border p-6"
        >
          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-error/10 border border-error/30 rounded-lg">
              <p className="text-sm text-error font-medium">{error}</p>
            </div>
          )}

          {/* Email */}
          <div className="mb-4">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-text-secondary mb-1"
            >
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ej: usuario@healthcore.com"
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
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-700/20"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-primary-700 text-white text-sm font-semibold hover:bg-primary-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Iniciando sesión..." : "Iniciar sesión"}
          </button>

          {/* Register link */}
          <div className="mt-4 text-center">
            <span className="text-xs text-text-secondary">
              ¿No tienes cuenta?{" "}
            </span>
            <Link
              href="/register"
              className="text-xs text-primary-700 hover:text-primary-800 font-medium"
            >
              Regístrate
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}