/* ═══════════════════════════════════════════════
   HealthCore — Talent Pipeline
   Candidate List Page (/)
   ═══════════════════════════════════════════════ */

"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { CandidateSearch } from "@/components/candidates/CandidateSearch";
import { CandidateFilters } from "@/components/candidates/CandidateFilters";
import { CandidateCard } from "@/components/candidates/CandidateCard";
import { useRecordList } from "@/hooks/useRecords";
import {
  LoadingSkeleton,
  ErrorMessage,
  EmptyState,
} from "@/components/ui/Feedback";
import type { CandidateStatus, CandidateStage } from "@/types";

function CandidateListContent() {
  const searchParams = useSearchParams();
  const status = (searchParams.get("status") ?? undefined) as
    | CandidateStatus
    | undefined;
  const stage = (searchParams.get("stage") ?? undefined) as
    | CandidateStage
    | undefined;
  const search = searchParams.get("search") ?? undefined;

  const { status: fetchStatus, data: candidates, error, refetch } = useRecordList({
    status,
    stage,
    search,
  });

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
        <CandidateSearch />
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

      {fetchStatus === "success" && candidates.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {candidates.map((candidate) => (
            <CandidateCard key={candidate.id} candidate={candidate} />
          ))}
        </div>
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
