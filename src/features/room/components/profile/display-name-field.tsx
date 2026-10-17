"use client";

import { useId } from "react";

import { Input, Label } from "@/components/ui/input";
import { LIMITS } from "@/domain/rules/limits";
import { cn } from "@/lib/cn";

export const NAME_TOO_LONG = `Keep your name to ${LIMITS.displayNameMaxLength} characters or fewer.`;

export interface DisplayNameFieldProps {
  value: string;
  onChange: (value: string) => void;
  error: string | null;
}

/** The optional display name (PRD FR-005). Blank means Anonymous. */
export function DisplayNameField({ value, onChange, error }: DisplayNameFieldProps) {
  const id = useId();
  const hintId = useId();
  const errorId = useId();

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4">
        <Label htmlFor={id}>Your name (optional)</Label>
        <span id={hintId} className="text-xs text-ink-muted">
          Leave blank to appear as Anonymous
        </span>
      </div>
      <Input
        id={id}
        name="displayName"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Anonymous"
        autoComplete="nickname"
        aria-invalid={error ? true : undefined}
        aria-describedby={cn(hintId, error && errorId)}
      />
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
