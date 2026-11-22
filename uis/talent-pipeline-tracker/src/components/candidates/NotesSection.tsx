/* ═══════════════════════════════════════════════
   HealthCore — Notes Section Component
   Lista, añade y elimina notas de un candidato
   ═══════════════════════════════════════════════ */

"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  LoadingSkeleton,
  ErrorMessage,
  EmptyState,
} from "@/components/ui/Feedback";
import { useNotes, useCreateNote, useDeleteNote } from "@/hooks/useRecords";
import type { Id } from "@/types";

interface NotesSectionProps {
  candidateId: Id;
}

function NotesSection({ candidateId }: NotesSectionProps) {
  const {
    status: fetchStatus,
    data: notes,
    error: fetchError,
    refetch,
  } = useNotes(candidateId);
  const { create, status: createStatus, error: createError } = useCreateNote();
  const { remove, status: deleteStatus } = useDeleteNote();
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteAuthor, setNewNoteAuthor] = useState("");
  const [localNotes, setLocalNotes] = useState(notes ?? []);

  useEffect(() => {
    if (notes) setLocalNotes(notes);
  }, [notes]);

  const handleAddNote = useCallback(async () => {
    if (!newNoteContent.trim() || !newNoteAuthor.trim()) return;
    try {
      const created = await create(candidateId, {
        content: newNoteContent,
        author: newNoteAuthor,
      });
      // API doesn't return author, so preserve it locally
      setLocalNotes((prev) => [{ ...created, author: newNoteAuthor }, ...prev]);
      setNewNoteContent("");
    } catch {
      // error handled by hook state
    }
  }, [newNoteContent, newNoteAuthor, candidateId, create]);

  const handleDeleteNote = useCallback(
    async (noteId: Id) => {
      try {
        await remove(candidateId, noteId);
        setLocalNotes((prev) => prev.filter((n) => n.id !== noteId));
      } catch {
        // error handled by hook state
      }
    },
    [candidateId, remove]
  );

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-heading text-lg font-semibold text-text-primary">
        Notes
      </h2>

      {/* Add note form */}
      <Card padding="md">
        <div className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Your name"
            value={newNoteAuthor}
            onChange={(e) => setNewNoteAuthor(e.target.value)}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary-700 min-h-11"
          />
          <textarea
            placeholder="Add a note..."
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary-700 resize-none"
          />
          {createError && (
            <p className="text-sm text-error" role="alert">
              {createError}
            </p>
          )}
          <Button
            onClick={handleAddNote}
            loading={createStatus === "loading"}
            disabled={!newNoteContent.trim() || !newNoteAuthor.trim()}
          >
            Add Note
          </Button>
        </div>
      </Card>

      {/* Notes list */}
      {fetchStatus === "loading" && <LoadingSkeleton count={3} />}
      {fetchStatus === "error" && (
        <ErrorMessage message={fetchError ?? "Failed to load notes"} onRetry={refetch} />
      )}
      {fetchStatus === "success" && localNotes.length === 0 && (
        <EmptyState title="No notes yet" description="Add the first note above." />
      )}
      {localNotes.length > 0 && (
        <div className="flex flex-col gap-3">
          {localNotes.map((note) => (
            <Card key={note.id} padding="sm">
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-text-primary">
                    {note.author || "Unknown"}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-secondary">
                      {new Date(note.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      disabled={deleteStatus === "loading"}
                      className="text-xs text-error hover:text-error/80 transition-colors focus:outline-none focus:underline"
                      aria-label="Delete note"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="text-sm text-text-primary whitespace-pre-wrap">
                  {note.content}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export { NotesSection };