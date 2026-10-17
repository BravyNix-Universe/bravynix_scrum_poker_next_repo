"use client";

import { type FormEvent, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { LIMITS } from "@/domain/rules/limits";
import { type TitleError, validateTitle } from "@/domain/rules/text";
import { cn } from "@/lib/cn";

import { useCreateRoom } from "../use-create-room";
import { RoomCreatedDialog } from "./room-created-dialog";

const TITLE_ERRORS: Record<TitleError, string> = {
  empty: "Enter an Epic name to create a room.",
  "too-long": `Keep the Epic name to ${LIMITS.titleMaxLength} characters or fewer.`,
};

export interface CreateRoomFormProps {
  note?: string;
  className?: string;
}

/** Landing page "Create room" form (PRD 8.1, FR-001). */
export function CreateRoomForm({ note, className }: CreateRoomFormProps) {
  const inputId = useId();
  const errorId = useId();
  const noteId = useId();
  const [epicName, setEpicName] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const { state, create, reset } = useCreateRoom();

  const errorMessage = validationError ?? (state.status === "failed" ? state.message : null);
  const isCreating = state.status === "creating";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = validateTitle(epicName);
    if (!result.ok) {
      setValidationError(TITLE_ERRORS[result.error]);
      return;
    }
    setValidationError(null);
    void create(result.value);
  }

  function handleDialogClose() {
    reset();
    setEpicName("");
  }

  return (
    <>
      <form noValidate onSubmit={handleSubmit} className={cn("flex flex-col gap-1.5", className)}>
        <Label htmlFor={inputId}>Epic name</Label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            id={inputId}
            name="epicName"
            value={epicName}
            onChange={(event) => {
              setEpicName(event.target.value);
              if (validationError) setValidationError(null);
            }}
            placeholder="Checkout revamp"
            autoComplete="off"
            aria-invalid={errorMessage ? true : undefined}
            aria-describedby={cn(errorMessage && errorId, note && noteId) || undefined}
          />
          <Button type="submit" disabled={isCreating} aria-disabled={isCreating}>
            {isCreating ? "Creating…" : "Create room"}
          </Button>
        </div>
        {errorMessage ? (
          <p id={errorId} role="alert" className="text-sm text-danger">
            {errorMessage}
          </p>
        ) : null}
        {note ? (
          <p id={noteId} className="mt-1 text-xs text-ink-subtle">
            {note}
          </p>
        ) : null}
      </form>

      <RoomCreatedDialog
        result={state.status === "created" ? state : null}
        onClose={handleDialogClose}
      />
    </>
  );
}
