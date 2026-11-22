/* ═══════════════════════════════════════════════
   HealthCore — Talent Pipeline API Service
   People & Talent team — Candidate Tracking System
   ═══════════════════════════════════════════════ */

import type {
  Candidate,
  CandidateFilters,
  CreateCandidatePayload,
  CreateNotePayload,
  Id,
  Note,
  PatchCandidatePayload,
  UpdateCandidatePayload,
  ApiCandidate,
  ApiNote,
  ApiPaginatedResponse,
  ApiResponseWrapper,
  CandidateStatus,
  CandidateStage,
} from "@/types";
import { mapCandidate, mapNote } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

/**
 * Build URL with query parameters for GET /records.
 * Uses snake_case for API query params.
 */
function buildRecordsUrl(filters?: CandidateFilters): string {
  const url = new URL(`${API_BASE}/records`);
  if (filters?.status) url.searchParams.set("status", filters.status);
  if (filters?.stage) url.searchParams.set("stage", filters.stage);
  if (filters?.search) url.searchParams.set("search", filters.search);
  return url.toString();
}

/**
 * Generic request handler with error management.
 */
async function apiRequest<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    const message = errorBody?.message ?? `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  // Handle 204 No Content (e.g., DELETE)
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

/* ───────────── Records / Candidates ──────────── */

/** Fetch all candidates with optional filters */
export async function getRecords(filters?: CandidateFilters): Promise<Candidate[]> {
  const url = buildRecordsUrl(filters);
  const result = await apiRequest<ApiPaginatedResponse<ApiCandidate>>(url);
  return result.data.map(mapCandidate);
}

/**
 * Check if a candidate with the given email already exists.
 * Uses the search endpoint and compares by exact email.
 */
export async function checkEmailExists(email: string): Promise<boolean> {
  const url = buildRecordsUrl({ search: email });
  const result = await apiRequest<ApiPaginatedResponse<ApiCandidate>>(url);
  return result.data.some((c) => c.email.toLowerCase() === email.toLowerCase());
}

/** Fetch a single candidate by ID */
export async function getRecord(id: Id): Promise<Candidate> {
  const result = await apiRequest<ApiCandidate>(
    `${API_BASE}/records/${id}`
  );
  return mapCandidate(result);
}

/** Create a new candidate */
export async function createRecord(
  payload: CreateCandidatePayload
): Promise<Candidate> {
  // Convert camelCase payload to snake_case for the API
  const body = {
    full_name: payload.name,
    email: payload.email,
    phone: payload.phone,
    position: payload.position,
    linkedin_url: payload.linkedInUrl,
    cv_url: payload.cvUrl,
    experience_years: payload.yearsOfExperience,
  };
  const result = await apiRequest<ApiCandidate>(`${API_BASE}/records`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return mapCandidate(result);
}

/** Update a candidate (full update) */
export async function updateRecord(
  id: Id,
  payload: UpdateCandidatePayload
): Promise<Candidate> {
  const body: Record<string, unknown> = {};
  if (payload.name !== undefined) body.full_name = payload.name;
  if (payload.email !== undefined) body.email = payload.email;
  if (payload.phone !== undefined) body.phone = payload.phone;
  if (payload.position !== undefined) body.position = payload.position;
  if (payload.linkedInUrl !== undefined) body.linkedin_url = payload.linkedInUrl;
  if (payload.cvUrl !== undefined) body.cv_url = payload.cvUrl;
  if (payload.yearsOfExperience !== undefined) body.experience_years = payload.yearsOfExperience;
  if (payload.status !== undefined) body.status = payload.status;
  if (payload.stage !== undefined) body.stage = payload.stage;

  const result = await apiRequest<ApiCandidate>(`${API_BASE}/records/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  return mapCandidate(result);
}

/** Patch a candidate (partial update — e.g., status or stage) */
export async function patchRecord(
  id: Id,
  payload: PatchCandidatePayload
): Promise<Candidate> {
  const result = await apiRequest<ApiCandidate>(`${API_BASE}/records/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return mapCandidate(result);
}

/* ───────────── Notes ──────────── */

/** Fetch all notes for a candidate */
export async function getNotes(id: Id): Promise<Note[]> {
  const result = await apiRequest<ApiResponseWrapper<ApiNote>>(
    `${API_BASE}/records/${id}/notes`
  );
  return (result.data ?? []).map(mapNote);
}

/** Add a note to a candidate */
export async function createNote(
  id: Id,
  payload: CreateNotePayload
): Promise<Note> {
  // API ignores author field, only accepts content
  const body = { content: payload.content };
  const result = await apiRequest<ApiNote>(`${API_BASE}/records/${id}/notes`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return mapNote({ ...result, record_id: id });
}

/** Delete a note */
export async function deleteNote(
  id: Id,
  noteId: Id
): Promise<void> {
  await apiRequest<void>(`${API_BASE}/records/${id}/notes/${noteId}`, {
    method: "DELETE",
  });
}