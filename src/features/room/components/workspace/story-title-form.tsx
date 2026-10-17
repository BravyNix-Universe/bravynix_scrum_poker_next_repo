"use client";

import { Plus } from "lucide-react";
import { type FormEvent, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { LIMITS } from "@/domain/rules/limits";
import { type TitleError, validateTitle } from "@/domain/rules/text";
import { cn } from "@/lib/cn";

const TITLE_ERRORS: Record<TitleError, string> = {
  empty: "Enter a story title.",
  "too-long": `Keep the story title to ${LIMITS.titleMaxLength} characters or fewer.`,
};

export interface StoryTitleFormProps {
  onSubmit: (title: string) => void;
  autoFocus?: boolean;
  className?: string;
}

/** A story is just a title of 1 to 160 characters (PRD FR-008, FR-010). */
export function StoryTitleForm({ onSubmit, autoFocus, className }: StoryTitleFormProps) {
  const inputId = useId();
  const errorId = useId();
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateTitle(title);
    if (!result.ok) {
      setError(TITLE_ERRORS[result.error]);
      return;
    }
    onSubmit(result.value);
    setTitle("");
    setError(null);
  }

  return (
    <form noValidate onSubmit={handleSubmit} className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={inputId}>Story title</Label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          id={inputId}
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            if (error) setError(null);
          }}
          placeholder="Show delivery ETA on the order page"
          autoComplete="off"
          autoFocus={autoFocus}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
        />
        <Button type="submit">
          <Plus aria-hidden className="size-4" />
          Add story
        </Button>
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </form>
  );
}
