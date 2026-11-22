/* ═══════════════════════════════════════════════
   HealthCore — UI Pagination Component
   ═══════════════════════════════════════════════ */

"use client";

import { Button } from "@/components/ui/Button";

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

function Pagination({ page, totalPages, total, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav
      className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between"
      aria-label="Pagination"
    >
      <p className="text-sm text-text-secondary">
        Showing page {page} of {totalPages}
        <span className="hidden sm:inline"> &mdash; {total} total candidates</span>
      </p>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {generatePageNumbers(page, totalPages).map((p, i) =>
            p === "..." ? (
              <span key={`ellipsis-${i}`} className="px-1 text-text-secondary">
                &hellip;
              </span>
            ) : (
              <Button
                key={p}
                type="button"
                variant={p === page ? "primary" : "ghost"}
                size="sm"
                onClick={() => onPageChange(p as number)}
                className="min-w-9 px-0"
              >
                {p}
              </Button>
            )
          )}
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}

/**
 * Generate a compact array of page numbers and ellipsis markers.
 * e.g. [1, "...", 4, 5, 6, "...", 10]
 */
function generatePageNumbers(
  current: number,
  total: number
): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "...")[] = [];

  if (current <= 4) {
    // Show first pages then ellipsis
    for (let i = 1; i <= 5; i++) pages.push(i);
    pages.push("...");
    pages.push(total);
  } else if (current >= total - 3) {
    // Show ellipsis then last pages
    pages.push(1);
    pages.push("...");
    for (let i = total - 4; i <= total; i++) pages.push(i);
  } else {
    // Show ellipsis on both sides
    pages.push(1);
    pages.push("...");
    pages.push(current - 1);
    pages.push(current);
    pages.push(current + 1);
    pages.push("...");
    pages.push(total);
  }

  return pages;
}

export { Pagination };