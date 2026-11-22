/* ═══════════════════════════════════════════════
   HealthCore — Status Control Component
   Permite actualizar el estado del candidato via PATCH
   ═══════════════════════════════════════════════ */

"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import {
  CANDIDATE_STATUS_LABELS,
  type CandidateStatus,
  type Candidate,
} from "@/types";
import { patchRecord } from "@/services/api";

interface StatusControlProps {
  candidate: Candidate;
  onUpdate: (updated: Candidate) => void;
}

function StatusControl({ candidate, onUpdate }: StatusControlProps) {
  const [status, setStatus] = useState<CandidateStatus>(candidate.status);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleUpdate = useCallback(async () => {
    if (status === candidate.status) return;
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const updated = await patchRecord(candidate.id, { status });
      onUpdate(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setLoading(false);
    }
  }, [status, candidate.id, candidate.status, onUpdate]);

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor="status-control"
        className="text-sm font-medium text-text-primary"
      >
        Status
      </label>
      <div className="flex items-center gap-2">
        <select
          id="status-control"
          value={status}
          onChange={(e) => setStatus(e.target.value as CandidateStatus)}
          className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-700 focus:border-primary-700 min-h-11"
        >
          {Object.entries(CANDIDATE_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          onClick={handleUpdate}
          loading={loading}
          disabled={status === candidate.status}
        >
          Update
        </Button>
      </div>
      {error && <p className="text-sm text-error">{error}</p>}
      {success && (
        <p className="text-sm text-success">Status updated successfully</p>
      )}
    </div>
  );
}

export { StatusControl };