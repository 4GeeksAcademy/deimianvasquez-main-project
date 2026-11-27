/**
 * Jest setup — global mocks for browser APIs used by api.ts.
 */

// Make this a module to avoid redeclaration conflicts with global types
export {};

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] ?? null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: jest.fn((index: number) => Object.keys(store)[index] ?? null),
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

// Mock document.cookie
type CookieEntry = { key: string; value: string };
const cookieStore: CookieEntry[] = [];
Object.defineProperty(document, "cookie", {
  get: jest.fn(() =>
    cookieStore.map((c) => `${c.key}=${c.value}`).join("; ")
  ),
  set: jest.fn((value: string) => {
    const [cookiePart] = value.split(";");
    const eqIdx = cookiePart.indexOf("=");
    const key = cookiePart.slice(0, eqIdx);
    const val = cookiePart.slice(eqIdx + 1);
    const keys = cookieStore.map((c) => c.key);
    const idx = keys.indexOf(key);
    if (idx !== -1) cookieStore.splice(idx, 1);
    if (!value.includes("max-age=0")) {
      cookieStore.push({ key, value: val });
    }
  }),
  configurable: true,
});

// window.location is provided by jsdom and cannot be redefined.
// Tests that need to check location.href should use:
//   Object.defineProperty(window, "location", { value: { href: "" }, configurable: true });
// or delete window.location first.
// We do NOT set a global mock here.

// Mock fetch
globalThis.fetch = jest.fn(() =>
  Promise.resolve(
    new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  )
) as jest.Mock;