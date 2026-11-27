/* ═══════════════════════════════════════════════
   HealthCore — View Toggle Component
   Alterna entre vista de tarjetas (grid) y tabla (list)
   ═══════════════════════════════════════════════ */

"use client";

import { Button } from "@/components/ui/Button";

export type ViewMode = "grid" | "list";

interface ViewToggleProps {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
}

function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
      <Button
        type="button"
        variant={view === "grid" ? "primary" : "ghost"}
        size="sm"
        onClick={() => onChange("grid")}
        aria-label="Grid view"
        className="min-h-0 px-2.5 py-1.5"
      >
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
          className="shrink-0"
        >
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
        </svg>
        <span className="hidden sm:inline">Grid</span>
      </Button>
      <Button
        type="button"
        variant={view === "list" ? "primary" : "ghost"}
        size="sm"
        onClick={() => onChange("list")}
        aria-label="List view"
        className="min-h-0 px-2.5 py-1.5"
      >
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
          className="shrink-0"
        >
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
        <span className="hidden sm:inline">List</span>
      </Button>
    </div>
  );
}

export { ViewToggle };