/**
 * HealthCore — Proxy
 * ===================
 * Server‑side request interceptor (Next.js 16 proxy).
 * Runs BEFORE any HTML is sent to the browser.
 *
 * Protected routes ( /suppliers, /incidents ) check for an auth cookie.
 * If the cookie is missing, the user is immediately redirected to /login
 * — no HTML is rendered, avoiding the flash‑of‑content problem.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Routes that require an active session */
const PROTECTED_ROUTES = ["/suppliers", "/incidents", "/account", "/inventory"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Only intercept protected routes
  const isProtected = PROTECTED_ROUTES.some((prefix) =>
    pathname === prefix || pathname.startsWith(prefix + "/")
  );

  if (!isProtected) {
    return; // let the request through
  }

  // 2. Check for auth cookie
  const tokenCookie = request.cookies.get("healthcore_token");

  if (!tokenCookie) {
    // No session → redirect to /login immediately (server‑side 302)
    const loginUrl = new URL("/login", request.url);
    // Preserve the original path so we can redirect back after login
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Token cookie present → render the page normally
}