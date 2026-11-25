/**
 * HealthCore — Auth Guard
 * ========================
 * Client-side page protection. Redirects to /login if no token exists.
 * Call at the top of any page component that requires authentication.
 *
 * @example
 *   import { requireAuth } from "@/services/auth-guard";
 *
 *   export default function SuppliersPage() {
 *     requireAuth();
 *     // ... rest of page
 *   }
 */

import { isAuthenticated } from "@/services/api";

export function requireAuth(): void {
  if (typeof window === "undefined") return; // SSR safety

  if (!isAuthenticated()) {
    // Avoid redirect loop: only redirect if we're not already on /login
    if (!window.location.pathname.startsWith("/login")) {
      window.location.href = "/login";
    }
  }
}