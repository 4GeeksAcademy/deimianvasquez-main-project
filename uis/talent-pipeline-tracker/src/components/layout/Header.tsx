/* ═══════════════════════════════════════════════
   HealthCore — Header Component
   ═══════════════════════════════════════════════ */

import Link from "next/link";

function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-700">
            <span className="text-sm font-bold text-white">HC</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-tight text-text-primary">
              HealthCore
            </span>
            <span className="text-[10px] leading-tight text-text-secondary">
              Talent Pipeline
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm font-medium text-text-secondary transition-colors hover:text-primary-700"
          >
            Candidates
          </Link>
          <Link
            href="/candidates-new"
            className="rounded-lg bg-primary-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-700 focus:ring-offset-2"
          >
            + New Candidate
          </Link>
        </nav>
      </div>
    </header>
  );
}

export { Header };