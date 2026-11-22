/* ═══════════════════════════════════════════════
   HealthCore — Candidate Card Component
   Tarjeta de resumen para el listado de candidatos
   ═══════════════════════════════════════════════ */

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import {
  CANDIDATE_STATUS_LABELS,
  CANDIDATE_STAGE_LABELS,
  statusToVariant,
  type Candidate,
} from "@/types";

interface CandidateCardProps {
  candidate: Candidate;
}

function CandidateCard({ candidate }: CandidateCardProps) {
  return (
    <Link href={`/candidates/${candidate.id}`} className="block group">
      <Card className="transition-shadow duration-200 hover:shadow-md">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-base font-semibold text-text-primary group-hover:text-primary-700 transition-colors">
                {candidate.name}
              </h3>
              <p className="truncate text-sm text-text-secondary">
                {candidate.position}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusToVariant(candidate.status)}>
              {CANDIDATE_STATUS_LABELS[candidate.status]}
            </Badge>
            <Badge variant="default">
              {CANDIDATE_STAGE_LABELS[candidate.stage]}
            </Badge>
          </div>

          <div className="flex items-center gap-4 text-xs text-text-secondary">
            <span>{candidate.yearsOfExperience} yrs exp.</span>
            <span>
              Applied{" "}
              {new Date(candidate.appliedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export { CandidateCard };