/**
 * Tests for api.ts — auth helpers (AUTH-088)
 * ==========================================
 * Covers: getToken, setToken, clearToken, isAuthenticated,
 *         login, fetchWithAuth, forgotPassword, resetPassword, changePassword
 *
 * Browser APIs (localStorage, document.cookie, fetch, window.location)
 * are mocked in setup.ts.
 */

/* eslint-disable @typescript-eslint/unbound-method */

import {
  getToken,
  setToken,
  clearToken,
  isAuthenticated,
  login,
  fetchWithAuth,
  forgotPassword,
  resetPassword,
  changePassword,
  API_BASE,
} from "../api";

// ── Helpers ──────────────────────────────────────────────────────

const mockFetchOnce = (
  status: number,
  body: unknown,
  ok?: boolean
): jest.Mock => {
  const response = {
    ok: ok ?? (status >= 200 && status < 300),
    status,
    headers: new Headers({ "Content-Type": "application/json" }),
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
  };
  (globalThis.fetch as jest.Mock).mockResolvedValueOnce(response);
  return globalThis.fetch as jest.Mock;
};

const mockFetchError = (error: Error): void => {
  (globalThis.fetch as jest.Mock).mockRejectedValueOnce(error);
};

beforeEach(() => {
  localStorage.clear();
  (globalThis.fetch as jest.Mock).mockClear();
});

// ══════════════════════════════════════════════════════════════════
//  Token management
// ══════════════════════════════════════════════════════════════════

describe("getToken", () => {
  it("returns null when no token is stored", () => {
    expect(getToken()).toBeNull();
  });

  it("returns the token stored in localStorage", () => {
    localStorage.setItem("healthcore_token", "my-jwt-token");
    expect(getToken()).toBe("my-jwt-token");
  });
});

describe("setToken", () => {
  it("stores the token in localStorage and sets a cookie", () => {
    setToken("test-token");

    expect(localStorage.setItem).toHaveBeenCalledWith(
      "healthcore_token",
      "test-token"
    );
    expect(document.cookie).toContain("healthcore_token=1");
  });

  it("throws and clears token if localStorage write fails", () => {
    (localStorage.setItem as jest.Mock).mockImplementationOnce(() => {
      throw new Error("Storage full");
    });

    expect(() => setToken("fail-token")).toThrow("Unable to start session");
    expect(localStorage.removeItem).toHaveBeenCalledWith("healthcore_token");
  });
});

describe("clearToken", () => {
  it("removes token from localStorage and expires the cookie", () => {
    localStorage.setItem("healthcore_token", "token-to-clear");
    clearToken();

    expect(localStorage.removeItem).toHaveBeenCalledWith("healthcore_token");
  });

  it("does not throw when nothing is stored", () => {
    expect(() => clearToken()).not.toThrow();
  });
});

describe("isAuthenticated", () => {
  it("returns false when no token is stored", () => {
    expect(isAuthenticated()).toBe(false);
  });

  it("returns true when a token is stored", () => {
    localStorage.setItem("healthcore_token", "some-token");
    expect(isAuthenticated()).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════
//  login
// ══════════════════════════════════════════════════════════════════

describe("login", () => {
  const validCredentials = { email: "a@b.com", password: "secret" };

  it("happy path: sends POST /auth/login, stores token, fetches user", async () => {
    mockFetchOnce(200, { access_token: "my-token" });
    mockFetchOnce(200, {
      email: "a@b.com",
      role: "user",
      profile: { name: null, phone: null, address: null },
    });

    const user = await login(validCredentials.email, validCredentials.password);

    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      `${API_BASE}/auth/login`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(validCredentials),
      })
    );
    expect(localStorage.setItem).toHaveBeenCalledWith(
      "healthcore_token",
      "my-token"
    );
    expect(user.email).toBe("a@b.com");
  });

  it("rejects with error detail when server returns 401", async () => {
    mockFetchOnce(401, { detail: "Credenciales inválidas" }, false);

    await expect(
      login(validCredentials.email, "wrong")
    ).rejects.toThrow("Credenciales inválidas");
  });

  it("clears token and re-throws if fetchMe fails after login", async () => {
    mockFetchOnce(200, { access_token: "t" });
    mockFetchError(new Error("Network error"));

    await expect(login("a@b.com", "p")).rejects.toThrow();
    expect(localStorage.removeItem).toHaveBeenCalledWith("healthcore_token");
  });
});

// ══════════════════════════════════════════════════════════════════
//  fetchWithAuth
// ══════════════════════════════════════════════════════════════════

describe("fetchWithAuth", () => {
  it("attaches Bearer token when token exists", async () => {
    localStorage.setItem("healthcore_token", "token-123");
    mockFetchOnce(200, {});

    await fetchWithAuth(`${API_BASE}/auth/me`);

    const callHeaders = (globalThis.fetch as jest.Mock).mock.calls[0][1].headers;
    expect(callHeaders.get("Authorization")).toBe("Bearer token-123");
  });

  it("does not attach Authorization when no token", async () => {
    mockFetchOnce(200, {});

    await fetchWithAuth(`${API_BASE}/auth/me`);

    const callHeaders = (globalThis.fetch as jest.Mock).mock.calls[0][1].headers;
    expect(callHeaders.get("Authorization")).toBeNull();
  });

  it("clears session and throws on 401 (redirect not verified in jsdom)", async () => {
    localStorage.setItem("healthcore_token", "expired-token");
    mockFetchOnce(401, {}, false);

    await expect(fetchWithAuth(`${API_BASE}/auth/me`)).rejects.toThrow(
      "Sesión expirada"
    );
    expect(localStorage.removeItem).toHaveBeenCalledWith("healthcore_token");
  });
});

// ══════════════════════════════════════════════════════════════════
//  forgotPassword
// ══════════════════════════════════════════════════════════════════

describe("forgotPassword", () => {
  it("sends POST to forgot-password with email", async () => {
    mockFetchOnce(200, { message: "ok" });

    await forgotPassword("test@healthcore.com");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE}/auth/forgot-password`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "test@healthcore.com" }),
      })
    );
  });

  it("throws on server error", async () => {
    mockFetchOnce(400, { detail: "Bad request" }, false);

    await expect(forgotPassword("bad@email.com")).rejects.toThrow(
      "Bad request"
    );
  });

  it("throws generic error when no detail is returned", async () => {
    mockFetchOnce(500, {}, false);

    await expect(forgotPassword("a@b.com")).rejects.toThrow(
      "Error al solicitar restablecimiento de contraseña"
    );
  });
});

// ══════════════════════════════════════════════════════════════════
//  resetPassword
// ══════════════════════════════════════════════════════════════════

describe("resetPassword", () => {
  it("sends POST to reset-password with token and new_password", async () => {
    mockFetchOnce(200, { message: "ok" });

    await resetPassword("reset-token", "newPass123");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE}/auth/reset-password`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          token: "reset-token",
          new_password: "newPass123",
        }),
      })
    );
  });

  it("throws on server error", async () => {
    mockFetchOnce(400, { detail: "Invalid or expired token" }, false);

    await expect(
      resetPassword("bad-token", "newPass123")
    ).rejects.toThrow("Invalid or expired token");
  });
});

// ══════════════════════════════════════════════════════════════════
//  changePassword
// ══════════════════════════════════════════════════════════════════

describe("changePassword", () => {
  it("sends POST to change-password with auth and payload", async () => {
    localStorage.setItem("healthcore_token", "auth-token");
    mockFetchOnce(200, { message: "ok" });

    await changePassword("oldPass", "newPass123");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${API_BASE}/auth/change-password`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          current_password: "oldPass",
          new_password: "newPass123",
        }),
      })
    );
  });

  it("throws on server error", async () => {
    localStorage.setItem("healthcore_token", "auth-token");
    mockFetchOnce(400, { detail: "Wrong current password" }, false);

    await expect(
      changePassword("wrong", "newPass123")
    ).rejects.toThrow("Wrong current password");
  });
});