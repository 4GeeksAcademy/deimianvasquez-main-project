"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useLocale } from "@/services/locale-provider";
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
  const t = useTranslations("navbar");
  const { locale, setLocale } = useLocale();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<ReturnType<typeof getCachedUser> | "loading" | null>(null);

  const isActive = (path: string) => pathname === path;

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, []);

  // Fetch current user on mount
  useEffect(() => {
    if (isAuthenticated()) {
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
            clearToken();
            setUser(null);
          });
      }
    } else {
      setUser(null);
    }
  }, []);

  const toggleLang = () => {
    setLocale(locale === "es" ? "en" : "es");
  };

  const isLoggedIn = user && user !== "loading";

  return (
    <nav className="bg-surface border-b border-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Brand */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-8 h-8 rounded-lg bg-primary-700 flex items-center justify-center text-white font-bold text-sm group-hover:bg-primary-800 transition-colors">
              HC
            </div>
            <span className="text-lg font-semibold text-text-primary">
              HealthCore
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden min-[901px]:flex items-center gap-1 min-w-0">
            <NavLink href="/" active={isActive("/")}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              {t("home")}
            </NavLink>

            {isLoggedIn && (
              <>
                <NavLink href="/incidents" active={isActive("/incidents")}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {t("incidents")}
                </NavLink>
                <NavLink href="/suppliers" active={isActive("/suppliers")}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  {t("suppliers")}
                </NavLink>
                <NavLink href="/inventory" active={isActive("/inventory") || pathname.startsWith("/inventory/")}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  {t("inventory")}
                </NavLink>
                <NavLink href="/account/profile" active={isActive("/account/profile")}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {t("profile")}
                </NavLink>
              </>
            )}

            {/* Language switcher - Desktop */}
            <button
              onClick={toggleLang}
              className="ml-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-text-secondary hover:bg-surface-muted transition-colors shrink-0"
              aria-label={`${t("language")} — ${locale === "es" ? "EN" : "ES"}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {locale === "es" ? "EN" : "ES"}
            </button>

            {/* Desktop User section */}
            <div className="ml-2 flex items-center gap-1 shrink-0">
              {user === "loading" ? (
                <span className="text-xs text-text-secondary px-2">{t("loading")}</span>
              ) : user ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-secondary px-2 truncate max-w-35">
                    {user.profile?.name || user.email}
                  </span>
                  {user.role === "admin" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 text-xs font-medium">
                      {t("admin")}
                    </span>
                  )}
                  <button
                    onClick={logout}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-error hover:bg-error/10 transition-colors"
                  >
                    {t("logout")}
                  </button>
                </div>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-primary-700 hover:bg-primary-100 transition-colors"
                  >
                    {t("login")}
                  </Link>
                  <Link
                    href="/register"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-700 text-white hover:bg-primary-800 transition-colors"
                  >
                    {t("register")}
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Mobile: Hamburger + Lang toggle */}
          <div className="flex min-[901px]:hidden items-center gap-2">
            {/* Lang toggle mobile */}
            <button
              onClick={toggleLang}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border text-text-secondary hover:bg-surface-muted transition-colors"
              aria-label={`${t("language")} — ${locale === "es" ? "EN" : "ES"}`}
            >
              {locale === "es" ? "EN" : "ES"}
            </button>

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-text-primary"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="min-[901px]:hidden border-t border-border bg-surface">
          <div className="px-4 py-3 space-y-1">
            <MobileNavLink href="/" active={isActive("/")} onClick={() => setMobileOpen(false)}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              {t("home")}
            </MobileNavLink>

            {isLoggedIn && (
              <>
                <MobileNavLink href="/incidents" active={isActive("/incidents")} onClick={() => setMobileOpen(false)}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {t("incidents")}
                </MobileNavLink>
                <MobileNavLink href="/suppliers" active={isActive("/suppliers")} onClick={() => setMobileOpen(false)}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  {t("suppliers")}
                </MobileNavLink>
                <MobileNavLink href="/inventory" active={isActive("/inventory") || pathname.startsWith("/inventory/")} onClick={() => setMobileOpen(false)}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  {t("inventory")}
                </MobileNavLink>
                <MobileNavLink href="/account/profile" active={isActive("/account/profile")} onClick={() => setMobileOpen(false)}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {t("profile")}
                </MobileNavLink>
              </>
            )}

            {/* Mobile user section */}
            <div className="pt-2 mt-2 border-t border-border">
              {user === "loading" ? (
                <p className="px-3 py-2 text-xs text-text-secondary">{t("loading")}</p>
              ) : user ? (
                <div className="px-3 py-2 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-primary font-medium truncate max-w-[200px]">
                      {user.profile?.name || user.email}
                    </span>
                    {user.role === "admin" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 text-xs font-medium">
                        {t("admin")}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={logout}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-error hover:bg-error/10 transition-colors"
                  >
                    {t("logout")}
                  </button>
                </div>
              ) : (
                <div className="px-3 py-2 flex flex-col gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-primary-700 hover:bg-primary-100 transition-colors"
                  >
                    {t("login")}
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileOpen(false)}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-primary-700 text-white hover:bg-primary-800 transition-colors"
                  >
                    {t("register")}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ── Desktop NavLink ──────────────────────────────────────── */

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
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
        active
          ? "bg-primary-100 text-primary-700"
          : "text-text-secondary hover:text-text-primary hover:bg-surface-muted"
      }`}
    >
      {children}
    </Link>
  );
}

/* ── Mobile NavLink ───────────────────────────────────────── */

function MobileNavLink({
  href,
  active,
  onClick,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        active
          ? "bg-primary-100 text-primary-700"
          : "text-text-secondary hover:text-text-primary hover:bg-surface-muted"
      }`}
    >
      {children}
    </Link>
  );
}