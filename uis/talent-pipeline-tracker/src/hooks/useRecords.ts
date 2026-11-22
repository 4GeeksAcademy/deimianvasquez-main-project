/* ═══════════════════════════════════════════════
   HealthCore — Talent Pipeline Custom Hooks
   People & Talent team — State management for candidate operations
   ═══════════════════════════════════════════════ */

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Candidate,
  CandidateFilters,
  CreateCandidatePayload,
  CreateNotePayload,
  Id,
  Note,
  PatchCandidatePayload,
  UpdateCandidatePayload,
} from "@/types";
import {
  createNote,
  createRecord,
  deleteNote,
  getNotes,
  getRecord,
  getRecords,
  patchRecord,
  updateRecord,
} from "@/services/api";

/* ──── Utility type for async states ──── */

export type AsyncState<T> =
  | { status: "idle"; data: null; error: null }
  | { status: "loading"; data: null; error: null }
  | { status: "success"; data: T; error: null }
  | { status: "error"; data: null; error: string };

/* ──── Hook: useRecordList (fetch candidates with filters) ──── */

export function useRecordList(filters: CandidateFilters) {
  const [state, setState] = useState<AsyncState<Candidate[]>>({
    status: "idle",
    data: null,
    error: null,
  });

  // Serialize filters to a stable string key so that inline object
  // creation does not cause an infinite re-fetch loop.
  const filtersKey = JSON.stringify(filters);

  const fetchRecords = useCallback(async () => {
    setState({ status: "loading", data: null, error: null });
    try {
      const parsed = JSON.parse(filtersKey) as CandidateFilters;
      const data = await getRecords(parsed);
      setState({ status: "success", data, error: null });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch candidates";
      setState({ status: "error", data: null, error: message });
    }
  }, [filtersKey]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  return { ...state, refetch: fetchRecords };
}

/* ──── Hook: useRecord (fetch single candidate) ──── */

export function useRecord(id: Id) {
  const [state, setState] = useState<AsyncState<Candidate>>({
    status: "idle",
    data: null,
    error: null,
  });

  const fetchRecord = useCallback(async () => {
    setState({ status: "loading", data: null, error: null });
    try {
      const data = await getRecord(id);
      setState({ status: "success", data, error: null });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch candidate";
      setState({ status: "error", data: null, error: message });
    }
  }, [id]);

  useEffect(() => {
    fetchRecord();
  }, [fetchRecord]);

  return { ...state, refetch: fetchRecord };
}

/* ──── Hook: useNotes (fetch notes for a candidate) ──── */

export function useNotes(id: Id) {
  const [state, setState] = useState<AsyncState<Note[]>>({
    status: "idle",
    data: null,
    error: null,
  });

  const fetchNotes = useCallback(async () => {
    setState({ status: "loading", data: null, error: null });
    try {
      const data = await getNotes(id);
      setState({ status: "success", data, error: null });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch notes";
      setState({ status: "error", data: null, error: message });
    }
  }, [id]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  return { ...state, refetch: fetchNotes };
}

/* ──── Mutation hooks ──── */

export function useCreateRecord() {
  const [state, setState] = useState<AsyncState<Candidate>>({
    status: "idle",
    data: null,
    error: null,
  });

  const create = useCallback(async (payload: CreateCandidatePayload) => {
    setState({ status: "loading", data: null, error: null });
    try {
      const data = await createRecord(payload);
      setState({ status: "success", data, error: null });
      return data;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create candidate";
      setState({ status: "error", data: null, error: message });
      throw err;
    }
  }, []);

  return { ...state, create };
}

export function useUpdateRecord() {
  const [state, setState] = useState<AsyncState<Candidate>>({
    status: "idle",
    data: null,
    error: null,
  });

  const update = useCallback(
    async (id: Id, payload: UpdateCandidatePayload) => {
      setState({ status: "loading", data: null, error: null });
      try {
        const data = await updateRecord(id, payload);
        setState({ status: "success", data, error: null });
        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to update candidate";
        setState({ status: "error", data: null, error: message });
        throw err;
      }
    },
    []
  );

  return { ...state, update };
}

export function usePatchRecord() {
  const [state, setState] = useState<AsyncState<Candidate>>({
    status: "idle",
    data: null,
    error: null,
  });

  const patch = useCallback(async (id: Id, payload: PatchCandidatePayload) => {
    setState({ status: "loading", data: null, error: null });
    try {
      const data = await patchRecord(id, payload);
      setState({ status: "success", data, error: null });
      return data;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update candidate";
      setState({ status: "error", data: null, error: message });
      throw err;
    }
  }, []);

  return { ...state, patch };
}

export function useCreateNote() {
  const [state, setState] = useState<AsyncState<Note>>({
    status: "idle",
    data: null,
    error: null,
  });

  const create = useCallback(async (id: Id, payload: CreateNotePayload) => {
    setState({ status: "loading", data: null, error: null });
    try {
      const data = await createNote(id, payload);
      setState({ status: "success", data, error: null });
      return data;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create note";
      setState({ status: "error", data: null, error: message });
      throw err;
    }
  }, []);

  return { ...state, create };
}

export function useDeleteNote() {
  const [state, setState] = useState<AsyncState<void>>({
    status: "idle",
    data: null,
    error: null,
  });

  const remove = useCallback(async (id: Id, noteId: Id) => {
    setState({ status: "loading", data: null, error: null });
    try {
      await deleteNote(id, noteId);
      setState({ status: "success", data: undefined, error: null });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete note";
      setState({ status: "error", data: null, error: message });
      throw err;
    }
  }, []);

  return { ...state, remove };
}