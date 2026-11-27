/* ═══════════════════════════════════════════════
   HealthCore — Talent Pipeline
   Edit Candidate Page (/candidates/[id]/edit)
   ═══════════════════════════════════════════════ */

"use client";

import { Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { LoadingSkeleton, ErrorMessage } from "@/components/ui/Feedback";
import CandidateForm from "@/components/candidates/CandidateForm";
import { useRecord, useUpdateRecord } from "@/hooks/useRecords";
import type { CreateCandidatePayload } from "@/types";

function EditCandidateContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const {
    status: fetchStatus,
    data: candidate,
    error: fetchError,
    refetch,
  } = useRecord(id);
  const { status: updateStatus, update, error: updateError } = useUpdateRecord();

  const handleSubmit = async (payload: CreateCandidatePayload) => {
    try {
      await update(id, payload);
      router.push(`/candidates/${id}`);
    } catch {
      // error is captured by the hook
    }
  };

  if (fetchStatus === "loading") {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <LoadingSkeleton count={1} />
      </div>
    );
  }

  if (fetchStatus === "error") {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <ErrorMessage
          message={fetchError ?? "Failed to load candidate"}
          onRetry={refetch}
        />
      </div>
    );
  }

  if (!candidate) return null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-text-secondary">
        <Link href="/" className="hover:text-primary-700 transition-colors">
          Candidates
        </Link>
        <span>/</span>
        <Link
          href={`/candidates/${id}`}
          className="hover:text-primary-700 transition-colors"
        >
          {candidate.name}
        </Link>
        <span>/</span>
        <span className="text-text-primary">Edit</span>
      </nav>

      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Edit Candidate
        </h1>
        <p className="mt-1 text-base text-text-secondary">
          Update the candidate&apos;s information.
        </p>
      </div>

      <Card padding="lg">
        <CandidateForm
          mode="edit"
          initialData={candidate}
          onSubmit={handleSubmit}
          loading={updateStatus === "loading"}
          error={updateError}
        />
      </Card>
    </div>
  );
}

export default function EditCandidatePage() {
  return (
    <>
      <Header />
      <Suspense
        fallback={
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
            <LoadingSkeleton count={1} />
          </div>
        }
      >
        <EditCandidateContent />
      </Suspense>
    </>
  );
}