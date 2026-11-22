/* ═══════════════════════════════════════════════
   HealthCore — Talent Pipeline
   Candidate List Page (/)
   ═══════════════════════════════════════════════ */

"use client";

import { Suspense, useState, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { CandidateSearch } from "@/components/candidates/CandidateSearch";
import { CandidateFilters } from "@/components/candidates/CandidateFilters";
import { CandidateCard } from "@/components/candidates/CandidateCard";
import { CandidateTable } from "@/components/candidates/CandidateTable";
import { ViewToggle } from "@/components/candidates/ViewToggle";
import type { ViewMode } from "@/components/candidates/ViewToggle";
import { Pagination } from "@/components/ui/Pagination";
import { useRecordList } from "@/hooks/useRecords";
import {
  LoadingSkeleton,
  ErrorMessage,
  EmptyState,
} from "@/components/ui/Feedback";
import type { CandidateStatus, CandidateStage } from "@/types";

function CandidateListContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const status = (searchParams.get("status") ?? undefined) as
    | CandidateStatus
    | undefined;
  const stage = (searchParams.get("stage") ?? undefined) as
    | CandidateStage
    | undefined;
  const search = searchParams.get("search") ?? undefined;
  const currentPage = parseInt(searchParams.get("page") ?? "1", 10);

  const {
    candidates,
    total,
    page,
    totalPages,
    status: fetchStatus,
    error,
    refetch,
  } = useRecordList({
    status,
    stage,
    search,
    page: currentPage,
    limit: 12,
  });

  const [view, setView] = useState<ViewMode>("grid");

  const handlePageChange = useCallback(
    (newPage: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (newPage > 1) {
        params.set("page", String(newPage));
      } else {
        params.delete("page");
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname]
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">
            Candidates
          </h1>
          <p className="text-sm text-text-secondary">
            Manage and track hiring pipeline candidates
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle view={view} onChange={setView} />
          <CandidateSearch />
        </div>
      </div>

      <CandidateFilters />

      {fetchStatus === "loading" && <LoadingSkeleton count={6} />}

      {fetchStatus === "error" && (
        <ErrorMessage message={error ?? "An error occurred"} onRetry={refetch} />
      )}

      {fetchStatus === "success" && candidates.length === 0 && (
        <EmptyState
          title="No candidates found"
          description="Try adjusting your filters or search term."
        />
      )}

      {fetchStatus === "success" && candidates.length > 0 && view === "grid" && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {candidates.map((candidate) => (
              <CandidateCard key={candidate.id} candidate={candidate} />
            ))}
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            onPageChange={handlePageChange}
          />
        </>
      )}

      {fetchStatus === "success" && candidates.length > 0 && view === "list" && (
        <>
          <CandidateTable candidates={candidates} />
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <Header />
      <Suspense
        fallback={
          <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
            <LoadingSkeleton count={6} />
          </div>
        }
      >
        <CandidateListContent />
      </Suspense>
    </>
  );
}
