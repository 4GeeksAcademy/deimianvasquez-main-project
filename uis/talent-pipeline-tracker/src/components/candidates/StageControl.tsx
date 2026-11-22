/* ═══════════════════════════════════════════════
   HealthCore — Stage Control Component
   Permite actualizar la etapa del candidato via PATCH
   ═══════════════════════════════════════════════ */

"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import {
  CANDIDATE_STAGE_LABELS,
  type CandidateStage,
  type Candidate,
} from "@/types";
import { patchRecord } from "@/services/api";

interface StageControlProps {
  candidate: Candidate;
  onUpdate: (updated: Candidate) => void;
}

function StageControl({ candidate, onUpdate }: StageControlProps) {
  const [stage, setStage] = useState<CandidateStage>(candidate.stage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleUpdate = useCallback(async () => {
    if (stage === candidate.stage) return;
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const updated = await patchRecord(candidate.id, { stage });
      onUpdate(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update stage");
    } finally {
      setLoading(false);
    }
  }, [stage, candidate.id, candidate.stage, onUpdate]);

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor="stage-control"
        className="text-sm font-medium text-text-primary"
      >
        Stage
      </label>
      <div className="flex items-center gap-2">
        <select
          id="stage-control"
          value={stage}
          onChange={(e) => setStage(e.target.value as CandidateStage)}
          className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-700 focus:border-primary-700 min-h-11"
        >
          {Object.entries(CANDIDATE_STAGE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          onClick={handleUpdate}
          loading={loading}
          disabled={stage === candidate.stage}
        >
          Update
        </Button>
      </div>
      {error && <p className="text-sm text-error">{error}</p>}
      {success && (
        <p className="text-sm text-success">Stage updated successfully</p>
      )}
    </div>
  );
}

export { StageControl };