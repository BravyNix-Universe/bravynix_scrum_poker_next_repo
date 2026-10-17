"use client";

import { Ban, Check } from "lucide-react";
import { useId } from "react";

import { Avatar } from "@/components/ui/avatar";
import { AVATARS, type AvatarId } from "@/domain/avatars/avatars";
import { cn } from "@/lib/cn";

export interface AvatarPickerProps {
  value: AvatarId | null;
  onChange: (value: AvatarId | null) => void;
  className?: string;
}

const OPTIONS: readonly { id: AvatarId | null; label: string }[] = [
  { id: null, label: "No avatar" },
  ...AVATARS,
];

/**
 * Choose one avatar or none (PRD FR-005). Native radio buttons give arrow-key navigation and
 * screen-reader semantics; the selection shows a ring and a tick, not colour alone.
 */
export function AvatarPicker({ value, onChange, className }: AvatarPickerProps) {
  const name = useId();

  return (
    <fieldset className={cn("min-w-0", className)}>
      <legend className="text-sm font-medium text-ink">Choose an avatar</legend>
      <div className="mt-2 grid grid-cols-5 gap-2 sm:grid-cols-7">
        {OPTIONS.map((option) => {
          const checked = option.id === value;
          return (
            <label
              key={option.id ?? "none"}
              title={option.label}
              className={cn(
                "relative flex aspect-square cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl border bg-surface transition-colors motion-reduce:transition-none",
                "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary",
                checked
                  ? "border-primary bg-primary-soft ring-2 ring-primary"
                  : "border-line hover:border-line-strong hover:bg-canvas-sunken",
                // On phones "None" takes its own row so the 20 avatars sit in an even 5 x 4 grid.
                option.id === null &&
                  "col-span-full aspect-auto flex-row gap-2 py-2.5 sm:col-span-1 sm:aspect-square sm:flex-col sm:gap-0.5 sm:py-0",
              )}
            >
              <input
                type="radio"
                name={name}
                checked={checked}
                onChange={() => onChange(option.id)}
                aria-label={option.label}
                className="sr-only"
              />
              {option.id ? (
                <Avatar avatarId={option.id} size="md" className="bg-transparent" />
              ) : (
                <>
                  <Ban aria-hidden className="size-5 text-ink-subtle" />
                  <span aria-hidden className="text-sm font-medium text-ink-muted sm:text-2xs">
                    <span className="sm:hidden">No avatar</span>
                    <span className="hidden sm:inline">None</span>
                  </span>
                </>
              )}
              {checked ? (
                <span
                  aria-hidden
                  className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-white"
                >
                  <Check className="size-3" strokeWidth={3} />
                </span>
              ) : null}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
