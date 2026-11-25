"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  isAuthenticated,
  getCachedUser,
  fetchMe,
  logout,
  clearToken,
  setCachedUser,
} from "@/services/api";

export default function Navbar() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  // Fetch current user on mount if we have a token but no cached user
  const [user, setUser] = useState<ReturnType<typeof getCachedUser> | "loading" | null>(null);

  useEffect(() => {
    if (isAuthenticated()) {
      /* Sync cookie for the server-side proxy — if localStorage has a
         token but the cookie is missing (e.g. from before this feature
         was added), set it now so the proxy won't redirect. */
      try {
        document.cookie = "healthcore_token=1; path=/; max-age=86400; SameSite=Lax";
      } catch { /* ignore */ }

      const cached = getCachedUser();
      if (cached) {
        setUser(cached);
      } else {
        setUser("loading");
        fetchMe()
          .then((u) => {
            setUser(u);
            setCachedUser(u);
          })
          .catch(() => {
            // Token invalid — clear it
            clearToken();
            setUser(null);
          });
      }
    } else {
      setUser(null);
    }
  }, []);

  return (
    <nav className="bg-surface border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Brand */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-primary-700 flex items-center justify-center text-white font-bold text-sm group-hover:bg-primary-800 transition-colors">
              HC
            </div>
            <span className="text-lg font-semibold text-text-primary">
              HealthCore
            </span>
          </Link>

          {/* Navigation Links & User Menu */}
          <div className="flex items-center gap-1">
            <NavLink href="/" active={isActive("/")}>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              Home
            </NavLink>
            {/* Protected links — only visible when authenticated */}
            {user && user !== "loading" && (
              <>
                <NavLink href="/incidents" active={isActive("/incidents")}>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Incidentes
                </NavLink>
                <NavLink href="/suppliers" active={isActive("/suppliers")}>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                  Proveedores
                </NavLink>
                <NavLink href="/account/profile" active={isActive("/account/profile")}>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  Mi Perfil
                </NavLink>
              </>
            )}

            {/* User section */}
            <div className="ml-2 flex items-center gap-1">
              {user === "loading" ? (
                <span className="text-xs text-text-secondary px-2">Cargando...</span>
              ) : user ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-secondary px-2 truncate max-w-35">
                    {user.profile?.name || user.email}
                  </span>
                  {user.role === "admin" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 text-xs font-medium">
                      Admin
                    </span>
                  )}
                  <button
                    onClick={logout}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-error hover:bg-error/10 transition-colors"
                  >
                    Salir
                  </button>
                </div>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-primary-700 hover:bg-primary-100 transition-colors"
                  >
                    Iniciar sesión
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-700 text-white hover:bg-primary-800 transition-colors"
                  >
                    Registrarse
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? "bg-primary-100 text-primary-700"
          : "text-text-secondary hover:text-text-primary hover:bg-surface-muted"
      }`}
    >
      {children}
    </Link>
  );
}