/* ═══════════════════════════════════════════════
   HealthCore — Talent Pipeline Types
   People & Talent team — Candidate Tracking System
   ═══════════════════════════════════════════════ */

/** Unique identifier (UUID) */
export type Id = string;

/** ISO 8601 date-time string */
export type IsoDateTime = string;

/**
 * Candidate status in the hiring pipeline.
 * Reflects HealthCore's clinical hiring workflow.
 */
export type CandidateStatus =
  | "received"
  | "in_progress"
  | "selected"
  | "interview"
  | "reference_check"
  | "discarded"
  | "offered"
  | "hired"
  | "rejected"
  | "withdrawn";

/**
 * Stage within the current status.
 * Mirrors the detailed pipeline stages for clinical and non-clinical roles.
 */
export type CandidateStage =
  | "pending"
  | "review"
  | "personal_interview"
  | "technical_interview"
  | "offer_presented"
  | "technical_assessment"
  | "panel_interview"
  | "clinical_skills_assessment"
  | "credentialing"
  | "background_check"
  | "offer_extended"
  | "offer_accepted"
  | "onboarding"
  | "onboarding_complete";

/** Candidate status display labels (user-facing) */
export const CANDIDATE_STATUS_LABELS: Record<CandidateStatus, string> = {
  received: "Received",
  in_progress: "In Progress",
  selected: "Selected",
  interview: "Interview",
  reference_check: "Reference Check",
  discarded: "Discarded",
  offered: "Offered",
  hired: "Hired",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

/** Candidate stage display labels (user-facing) */
export const CANDIDATE_STAGE_LABELS: Record<CandidateStage, string> = {
  pending: "Pending",
  review: "Review",
  personal_interview: "Personal Interview",
  technical_interview: "Technical Interview",
  offer_presented: "Offer Presented",
  technical_assessment: "Technical Assessment",
  panel_interview: "Panel Interview",
  clinical_skills_assessment: "Clinical Skills Assessment",
  credentialing: "Credentialing",
  background_check: "Background Check",
  offer_extended: "Offer Extended",
  offer_accepted: "Offer Accepted",
  onboarding: "Onboarding",
  onboarding_complete: "Onboarding Complete",
};

/** Core candidate record */
export interface Candidate {
  id: Id;
  name: string;
  email: string;
  phone?: string;
  position: string;
  linkedInUrl?: string;
  cvUrl?: string;
  yearsOfExperience: number;
  status: CandidateStatus;
  stage: CandidateStage;
  appliedAt: IsoDateTime;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

/** Payload for creating a new candidate */
export interface CreateCandidatePayload {
  name: string;
  email: string;
  phone: string;
  position: string;
  linkedInUrl: string;
  cvUrl: string;
  yearsOfExperience: number;
}

/** Payload for updating a candidate (full update) */
export interface UpdateCandidatePayload
  extends Partial<CreateCandidatePayload> {
  status?: CandidateStatus;
  stage?: CandidateStage;
}

/** Payload for patching status or stage */
export interface PatchCandidatePayload {
  status?: CandidateStatus;
  stage?: CandidateStage;
}

/** Note attached to a candidate record */
export interface Note {
  id: Id;
  content: string;
  author: string;
  createdAt: IsoDateTime;
  candidateId: Id;
}

/** Payload for creating a note */
export interface CreateNotePayload {
  content: string;
  author: string;
}

/** Generic API response wrapper */
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

/** Generic API error */
export interface ApiError {
  message: string;
  statusCode: number;
  errors?: Record<string, string[]>;
}

/* ──── API Raw Types (snake_case from backend) ──── */

/** API raw candidate as returned by the backend */
export interface ApiCandidate {
  id: Id;
  full_name: string;
  email: string;
  phone?: string;
  position: string;
  linkedin_url?: string;
  cv_url?: string;
  experience_years: number;
  status: string;
  stage: string;
  applied_at: IsoDateTime;
  updated_at: IsoDateTime;
  notes?: ApiNote[];
  notes_count?: number;
}

/** API raw note as returned by the backend */
export interface ApiNote {
  id: Id;
  record_id: Id;
  content: string;
  created_at: IsoDateTime;
}

/** API paginated response (e.g., GET /records) */
export interface ApiPaginatedResponse<T> {
  total: number;
  page: number;
  limit: number;
  data: T[];
}

/** API wrapped response (e.g., GET /records/:id/notes) */
export interface ApiResponseWrapper<T> {
  data: T[];
  meta?: { total: number };
}

/* ──── API Mapper Functions ──── */

/** Map API candidate (snake_case) to frontend Candidate (camelCase) */
export function mapCandidate(api: ApiCandidate): Candidate {
  return {
    id: api.id,
    name: api.full_name ?? "",
    email: api.email,
    phone: api.phone,
    position: api.position,
    linkedInUrl: api.linkedin_url,
    cvUrl: api.cv_url,
    yearsOfExperience: api.experience_years,
    status: api.status as CandidateStatus,
    stage: api.stage as CandidateStage,
    appliedAt: api.applied_at,
    createdAt: api.applied_at,
    updatedAt: api.updated_at,
  };
}

/** Map API note (snake_case) to frontend Note (camelCase) */
export function mapNote(api: ApiNote): Note {
  return {
    id: api.id,
    content: api.content,
    author: "",
    createdAt: api.created_at,
    candidateId: api.record_id,
  };
}

/** Filters for the candidate list */
export interface CandidateFilters {
  status?: CandidateStatus;
  stage?: CandidateStage;
  search?: string;
  page?: number;
  limit?: number;
}

/** Paginated result from the API */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

/** Map candidate status to badge variant */
export function statusToVariant(
  status: CandidateStatus
): "info" | "primary" | "warning" | "success" | "error" | "default" {
  switch (status) {
    case "received":
      return "info";
    case "in_progress":
      return "primary";
    case "selected":
      return "success";
    case "interview":
    case "reference_check":
      return "warning";
    case "discarded":
      return "default";
    case "offered":
      return "primary";
    case "hired":
      return "success";
    case "rejected":
      return "error";
    case "withdrawn":
      return "default";
  }
}