/* ═══════════════════════════════════════════════
   HealthCore — Talent Pipeline
   CandidateForm Component (shared for create & edit)
   ═══════════════════════════════════════════════ */

"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import type { Candidate, CreateCandidatePayload } from "@/types";

export type CandidateFormErrors = Partial<
  Record<keyof CreateCandidatePayload | "form", string>
>;

interface CandidateFormProps {
  initialData?: Candidate;
  onSubmit: (payload: CreateCandidatePayload) => Promise<void>;
  loading: boolean;
  error?: string | null;
  mode: "create" | "edit";
}

function validate(
  payload: CreateCandidatePayload
): CandidateFormErrors | null {
  const errors: CandidateFormErrors = {};

  if (!payload.name.trim()) {
    errors.name = "Name is required";
  }
  if (!payload.email.trim()) {
    errors.email = "Email is required";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    errors.email = "Invalid email format";
  }
  if (!payload.phone.trim()) {
    errors.phone = "Phone is required";
  }
  if (!payload.position.trim()) {
    errors.position = "Position is required";
  }
  if (
    payload.yearsOfExperience === undefined ||
    payload.yearsOfExperience === null ||
    payload.yearsOfExperience < 0
  ) {
    errors.yearsOfExperience = "Years of experience must be 0 or more";
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

export default function CandidateForm({
  initialData,
  onSubmit,
  loading,
  error: serverError,
  mode,
}: CandidateFormProps) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [email, setEmail] = useState(initialData?.email ?? "");
  const [phone, setPhone] = useState(initialData?.phone ?? "");
  const [position, setPosition] = useState(initialData?.position ?? "");
  const [linkedInUrl, setLinkedInUrl] = useState(initialData?.linkedInUrl ?? "");
  const [cvUrl, setCvUrl] = useState(initialData?.cvUrl ?? "");
  const [yearsOfExperience, setYearsOfExperience] = useState(
    initialData?.yearsOfExperience?.toString() ?? "0"
  );
  const [fieldErrors, setFieldErrors] = useState<CandidateFormErrors | null>(
    null
  );
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFieldErrors(null);

    const payload: CreateCandidatePayload = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      position: position.trim(),
      linkedInUrl: linkedInUrl.trim() || undefined,
      cvUrl: cvUrl.trim() || undefined,
      yearsOfExperience: parseInt(yearsOfExperience, 10) || 0,
    };

    const validationErrors = validate(payload);
    if (validationErrors) {
      setFieldErrors(validationErrors);
      return;
    }

    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      {/* Server error */}
      {serverError && (
        <div
          className="rounded-lg border border-error bg-error/5 px-4 py-3 text-sm text-error"
          role="alert"
        >
          {serverError}
        </div>
      )}
      {fieldErrors?.form && (
        <div
          className="rounded-lg border border-error bg-error/5 px-4 py-3 text-sm text-error"
          role="alert"
        >
          {fieldErrors.form}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Full name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={fieldErrors?.name}
          placeholder="e.g. Jane Smith"
          required
        />
        <Input
          label="Email *"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors?.email}
          placeholder="e.g. jane.smith@healthcore.com"
          required
        />
        <Input
          label="Phone *"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={fieldErrors?.phone}
          placeholder="e.g. +1 (555) 123-4567"
          required
        />
        <Input
          label="Position *"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          error={fieldErrors?.position}
          placeholder="e.g. Registered Nurse"
          required
        />
        <Input
          label="Years of Experience *"
          type="number"
          min={0}
          value={yearsOfExperience}
          onChange={(e) => setYearsOfExperience(e.target.value)}
          error={fieldErrors?.yearsOfExperience}
        />
        <Input
          label="LinkedIn URL"
          type="url"
          value={linkedInUrl}
          onChange={(e) => setLinkedInUrl(e.target.value)}
          placeholder="e.g. https://linkedin.com/in/janesmith"
        />
        <Input
          label="CV URL"
          type="url"
          value={cvUrl}
          onChange={(e) => setCvUrl(e.target.value)}
          placeholder="e.g. https://example.com/cv.pdf"
        />
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={loading}>
          {mode === "create" ? "Add Candidate" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}