/* ═══════════════════════════════════════════════
   HealthCore — Candidate Search Component
   Filtra por nombre o email sin recargar la página
   ═══════════════════════════════════════════════ */

"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useTransition } from "react";

function CandidateSearch() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();

  const currentSearch = searchParams.get("search") ?? "";

  const handleSearch = useCallback(
    (term: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (term) {
        params.set("search", term);
      } else {
        params.delete("search");
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, router, pathname]
  );

  return (
    <div className="relative w-full sm:max-w-xs">
      <label htmlFor="candidate-search" className="sr-only">
        Search candidates by name or email
      </label>
      <input
        id="candidate-search"
        type="search"
        defaultValue={currentSearch}
        placeholder="Search by name or email..."
        onChange={(e) => handleSearch(e.target.value)}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 pl-10 text-base text-text-primary placeholder:text-text-secondary/60 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-700 focus:border-primary-700 min-h-11"
      />
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </span>
    </div>
  );
}

export { CandidateSearch };