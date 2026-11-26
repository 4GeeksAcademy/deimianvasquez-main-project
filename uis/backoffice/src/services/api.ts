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
    document.cookie = `healthcore_token=1; path=/; max-age=86400; SameSite=Lax`;
    if (
      localStorage.getItem("healthcore_token") !== token ||
      !document.cookie.split(";").some((cookie) => cookie.trim() === "healthcore_token=1")
    ) {
      throw new Error("Unable to start session");
    }
  } catch {
    clearToken();
    throw new Error("Unable to start session");
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
  try {
    return await fetchMe();
  } catch (error) {
    clearToken();
    _currentUser = null;
    throw error;
  }
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
      const messages = detail
        .map((item: { message?: unknown } | null) => item?.message)
        .filter((message): message is string => typeof message === "string" && message.trim().length > 0);
      throw new Error(messages.join(", ") || "Error al registrarse");
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

/* ── Profile management ────────────────────────────────────────── */

export interface ProfileUpdate {
  name?: string | null;
  phone?: string | null;
  address?: string | null;
}

/**
 * Update the authenticated user's profile (name, phone, address).
 * Calls PUT /profiles/me and then re-fetches the current user to
 * refresh the cache.
 */
export async function updateProfile(data: ProfileUpdate): Promise<CurrentUser> {
  const res = await fetchWithAuth(`${API_BASE}/profiles/me`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Error al actualizar el perfil");
  }

  // Re-fetch full user to refresh cache
  const user = await fetchMe();
  return user;
}

/* ── Logout ───────────────────────────────────────────────────── */

export function logout(): void {
  clearToken();
  _currentUser = null;
  window.location.href = "/login";
}

/* ── Password Reset ───────────────────────────────────────────── */

/**
 * Request a password reset email.
 * Calls POST /auth/forgot-password.
 * Always returns successfully to prevent user enumeration.
 */
export async function forgotPassword(email: string): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Error al solicitar restablecimiento de contraseña");
  }
}

/**
 * Reset password using a reset token.
 * Calls POST /auth/reset-password.
 */
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, new_password: newPassword }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Error al restablecer la contraseña");
  }
}

/**
 * Change the password for the currently authenticated user.
 * Calls POST /auth/change-password.
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const res = await fetchWithAuth(`${API_BASE}/auth/change-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      current_password: currentPassword,
      new_password: newPassword,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Error al cambiar la contraseña");
  }
}