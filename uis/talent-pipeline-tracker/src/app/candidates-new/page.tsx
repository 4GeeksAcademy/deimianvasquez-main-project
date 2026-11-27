/* ═══════════════════════════════════════════════
   HealthCore — Talent Pipeline
   New Candidate Page (/candidates-new)
   ═══════════════════════════════════════════════ */

"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import CandidateForm from "@/components/candidates/CandidateForm";
import { useCreateRecord } from "@/hooks/useRecords";
import type { CreateCandidatePayload } from "@/types";

export default function NewCandidatePage() {
  const router = useRouter();
  const { status, create, error } = useCreateRecord();

  const handleSubmit = async (payload: CreateCandidatePayload) => {
    try {
      const candidate = await create(payload);
      router.push(`/candidates/${candidate.id}`);
    } catch {
      // error is captured by the hook
    }
  };

  return (
    <>
      <Header />
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-text-secondary">
          <Link href="/" className="hover:text-primary-700 transition-colors">
            Candidates
          </Link>
          <span>/</span>
          <span className="text-text-primary">New Candidate</span>
        </nav>

        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">
            Add New Candidate
          </h1>
          <p className="mt-1 text-base text-text-secondary">
            Fill in the candidate&apos;s information below to add them to the
            talent pipeline.
          </p>
        </div>

        <Card padding="lg">
          <CandidateForm
            mode="create"
            onSubmit={handleSubmit}
            loading={status === "loading"}
            error={error}
          />
        </Card>
      </div>
    </>
  );
}