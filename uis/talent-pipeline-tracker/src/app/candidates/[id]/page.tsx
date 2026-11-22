/* ═══════════════════════════════════════════════
   HealthCore — Talent Pipeline
   Candidate Detail Page (/candidates/[id])
   ═══════════════════════════════════════════════ */

"use client";

import { Suspense, useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingSkeleton, ErrorMessage } from "@/components/ui/Feedback";
import { StatusControl } from "@/components/candidates/StatusControl";
import { StageControl } from "@/components/candidates/StageControl";
import { NotesSection } from "@/components/candidates/NotesSection";
import { useRecord } from "@/hooks/useRecords";
import {
  CANDIDATE_STATUS_LABELS,
  CANDIDATE_STAGE_LABELS,
  statusToVariant,
  type Candidate,
} from "@/types";

function CandidateDetailContent() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { status: fetchStatus, data: candidate, error, refetch } = useRecord(id);
  const [currentCandidate, setCurrentCandidate] = useState<Candidate | null>(null);

  const candidateData = currentCandidate ?? candidate;

  const handleUpdate = useCallback(
    (updated: Candidate) => {
      setCurrentCandidate(updated);
    },
    []
  );

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
        <ErrorMessage message={error ?? "Failed to load candidate"} onRetry={refetch} />
      </div>
    );
  }

  if (!candidateData) return null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-text-secondary">
        <Link href="/" className="hover:text-primary-700 transition-colors">
          Candidates
        </Link>
        <span>/</span>
        <span className="text-text-primary truncate">{candidateData.name}</span>
      </nav>

      {/* Header section */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">
            {candidateData.name}
          </h1>
          <p className="text-base text-text-secondary">{candidateData.position}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusToVariant(candidateData.status)}>
            {CANDIDATE_STATUS_LABELS[candidateData.status]}
          </Badge>
          <Badge variant="default">
            {CANDIDATE_STAGE_LABELS[candidateData.stage]}
          </Badge>
        </div>
      </div>

      {/* Main info card */}
      <Card padding="lg">
        <div className="grid gap-4 sm:grid-cols-2">
          <InfoField label="Email" value={candidateData.email} />
          <InfoField label="Phone" value={candidateData.phone ?? "—"} />
          <InfoField label="Position" value={candidateData.position} />
          <InfoField
            label="Experience"
            value={`${candidateData.yearsOfExperience} years`}
          />
          <InfoField
            label="LinkedIn"
            value={
              candidateData.linkedInUrl ? (
                <a
                  href={candidateData.linkedInUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-700 hover:underline"
                >
                  View Profile
                </a>
              ) : (
                "—"
              )
            }
          />
          <InfoField
            label="CV"
            value={
              candidateData.cvUrl ? (
                <a
                  href={candidateData.cvUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-700 hover:underline"
                >
                  Download CV
                </a>
              ) : (
                "—"
              )
            }
          />
          <InfoField
            label="Applied"
            value={new Date(candidateData.appliedAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          />
          <InfoField
            label="Last updated"
            value={new Date(candidateData.updatedAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          />
        </div>
      </Card>

      {/* Status & Stage controls */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card padding="md">
          <StatusControl candidate={candidateData} onUpdate={handleUpdate} />
        </Card>
        <Card padding="md">
          <StageControl candidate={candidateData} onUpdate={handleUpdate} />
        </Card>
      </div>

      {/* Edit button */}
      <div className="flex justify-end">
        <Button
          variant="secondary"
          onClick={() => router.push(`/candidates/${id}/edit`)}
        >
          Edit Candidate Data
        </Button>
      </div>

      {/* Notes section */}
      <NotesSection candidateId={id} />
    </div>
  );
}

function InfoField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">
        {label}
      </span>
      <span className="text-sm text-text-primary">{value}</span>
    </div>
  );
}

export default function CandidateDetailPage() {
  return (
    <>
      <Header />
      <Suspense fallback={
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <LoadingSkeleton count={1} />
        </div>
      }>
        <CandidateDetailContent />
      </Suspense>
    </>
  );
}