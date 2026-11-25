/**
 * HealthCore — API Client
 * =========================
 * Wrapper around fetch() that automatically attaches the JWT token
 * and redirects to /login on 401 responses.
 */

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

/* ── Token management ─────────────────────────────────────────── */

export function getToken(): string | null {
  try {
    return localStorage.getItem("healthcore_token");
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem("healthcore_token", token);
  } catch {
    // ignore
  }
  /* Also set a non‑HttpOnly cookie so the Next.js server‑side
     middleware (proxy.ts) can check authentication before rendering HTML. */
  try {
    document.cookie = `healthcore_token=1; path=/; max-age=86400; SameSite=Lax`;
  } catch {
    // ignore
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem("healthcore_token");
  } catch {
    // ignore
  }
  try {
    document.cookie = "healthcore_token=; path=/; max-age=0";
  } catch {
    // ignore
  }
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}

/* ── Current user cache (from /auth/me) ───────────────────────── */

export interface CurrentUser {
  email: string;
  role: "admin" | "manager" | "user";
  profile: {
    name: string | null;
    phone: string | null;
    address: string | null;
  };
}

let _currentUser: CurrentUser | null = null;

export function getCachedUser(): CurrentUser | null {
  return _currentUser;
}

export function setCachedUser(user: CurrentUser | null): void {
  _currentUser = user;
}

/* ── Auth helpers ─────────────────────────────────────────────── */

export async function login(email: string, password: string): Promise<CurrentUser> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Credenciales inválidas");
  }

  const data = await res.json();
  setToken(data.access_token);

  // Fetch current user info
  const user = await fetchMe();
  return user;
}

export async function register(
  email: string,
  password: string,
  name?: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    // data.detail could be a ValidationError array or a string
    const detail = data.detail;
    if (Array.isArray(detail)) {
      throw new Error(detail.map((d: { msg: string }) => d.msg).join(", "));
    }
    throw new Error(detail || "Error al registrarse");
  }
}

export async function fetchMe(): Promise<CurrentUser> {
  const res = await fetchWithAuth(`${API_BASE}/auth/me`);
  if (!res.ok) throw new Error("No se pudo obtener información del usuario");
  const user: CurrentUser = await res.json();
  _currentUser = user;
  return user;
}

/* ── Generic fetch with auth ──────────────────────────────────── */

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getToken();

  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  // If unauthorized, clear session and redirect to login
  if (res.status === 401) {
    clearToken();
    _currentUser = null;
    // Only redirect if we're not already on the login page
    if (!window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
    throw new Error("Sesión expirada. Redirigiendo al login...");
  }

  return res;
}

/* ── Logout ───────────────────────────────────────────────────── */

export function logout(): void {
  clearToken();
  _currentUser = null;
  window.location.href = "/login";
}