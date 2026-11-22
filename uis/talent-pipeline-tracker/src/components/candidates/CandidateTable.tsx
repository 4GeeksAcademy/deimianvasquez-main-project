/* ═══════════════════════════════════════════════
   HealthCore — Candidate Table Component
   Vista de tabla/lista para el listado de candidatos
   ═══════════════════════════════════════════════ */

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import {
  CANDIDATE_STATUS_LABELS,
  CANDIDATE_STAGE_LABELS,
  statusToVariant,
  type Candidate,
} from "@/types";

interface CandidateTableProps {
  candidates: Candidate[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function CandidateTable({ candidates }: CandidateTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-muted text-xs font-semibold uppercase tracking-wider text-text-secondary">
            <th className="px-4 py-3 sm:px-6">Name</th>
            <th className="hidden px-4 py-3 sm:table-cell">Email</th>
            <th className="hidden px-4 py-3 md:table-cell">Position</th>
            <th className="px-4 py-3">Status</th>
            <th className="hidden px-4 py-3 lg:table-cell">Stage</th>
            <th className="hidden px-4 py-3 md:table-cell">Exp.</th>
            <th className="hidden px-4 py-3 lg:table-cell">Applied</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {candidates.map((candidate) => (
            <tr
              key={candidate.id}
              className="transition-colors hover:bg-primary-50"
            >
              <td className="px-4 py-3 sm:px-6">
                <Link
                  href={`/candidates/${candidate.id}`}
                  className="block"
                >
                  <span className="font-medium text-text-primary hover:text-primary-700 transition-colors">
                    {candidate.name}
                  </span>
                </Link>
              </td>
              <td className="hidden px-4 py-3 text-text-secondary sm:table-cell">
                {candidate.email}
              </td>
              <td className="hidden px-4 py-3 text-text-secondary md:table-cell">
                {candidate.position}
              </td>
              <td className="px-4 py-3">
                <Badge variant={statusToVariant(candidate.status)}>
                  {CANDIDATE_STATUS_LABELS[candidate.status]}
                </Badge>
              </td>
              <td className="hidden px-4 py-3 lg:table-cell">
                <Badge variant="default">
                  {CANDIDATE_STAGE_LABELS[candidate.stage]}
                </Badge>
              </td>
              <td className="hidden px-4 py-3 text-text-secondary md:table-cell">
                {candidate.yearsOfExperience}y
              </td>
              <td className="hidden px-4 py-3 text-text-secondary lg:table-cell">
                {formatDate(candidate.appliedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { CandidateTable };