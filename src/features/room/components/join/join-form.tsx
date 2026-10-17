"use client";

import { ArrowRight, LockKeyhole } from "lucide-react";
import { type FormEvent, useId, useState } from "react";

import type { JoinRoomInput } from "@/application/room/join-room";
import type { RoomLobby } from "@/application/room/room-view";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import type { AvatarId } from "@/domain/avatars/avatars";
import type { Profile } from "@/domain/room/profile";
import { validateDisplayName } from "@/domain/room/profile";
import { LIMITS } from "@/domain/rules/limits";
import { cn } from "@/lib/cn";

import { AvatarPicker } from "./avatar-picker";

const NAME_TOO_LONG = `Keep your name to ${LIMITS.displayNameMaxLength} characters or fewer.`;

export interface JoinFormProps {
  lobby: RoomLobby;
  /** The remembered profile, if the person opted in on this device (PRD FR-055). */
  remembered: Profile | null;
  onJoin: (input: JoinRoomInput) => Promise<void>;
}

/** Optional name and avatar, then join (PRD 9.2 step 3, FR-005). */
export function JoinForm({ lobby, remembered, onJoin }: JoinFormProps) {
  const nameId = useId();
  const nameHintId = useId();
  const nameErrorId = useId();
  const [displayName, setDisplayName] = useState(remembered?.displayName ?? "");
  const [avatarId, setAvatarId] = useState<AvatarId | null>(remembered?.avatarId ?? null);
  const [remember, setRemember] = useState(remembered !== null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const isHost = lobby.role === "host";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateDisplayName(displayName).ok) {
      setNameError(NAME_TOO_LONG);
      return;
    }
    setPending(true);
    setJoinError(null);
    try {
      await onJoin({ displayName, avatarId, remember });
    } catch {
      setJoinError("Couldn't join the room. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="mt-8 flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4">
          <Label htmlFor={nameId}>Your name (optional)</Label>
          <span id={nameHintId} className="text-xs text-ink-muted">
            Leave blank to appear as Anonymous
          </span>
        </div>
        <Input
          id={nameId}
          name="displayName"
          value={displayName}
          onChange={(event) => {
            setDisplayName(event.target.value);
            if (nameError) setNameError(null);
          }}
          placeholder="Anonymous"
          autoComplete="nickname"
          aria-invalid={nameError ? true : undefined}
          aria-describedby={cn(nameHintId, nameError && nameErrorId)}
        />
        {nameError ? (
          <p id={nameErrorId} role="alert" className="text-sm text-danger">
            {nameError}
          </p>
        ) : null}
      </div>

      <AvatarPicker value={avatarId} onChange={setAvatarId} />

      <label className="flex cursor-pointer items-start gap-3 text-sm text-ink">
        <input
          type="checkbox"
          checked={remember}
          onChange={(event) => setRemember(event.target.checked)}
          className="mt-0.5 size-4 shrink-0 accent-primary"
        />
        <span>
          Remember my name and avatar on this device
          <span className="block text-xs text-ink-muted">
            Saved only in this browser. Leave unticked on a shared computer.
          </span>
        </span>
      </label>

      <div className="flex flex-col gap-3">
        {joinError ? (
          <p role="alert" className="text-sm text-danger">
            {joinError}
          </p>
        ) : null}
        <Button type="submit" size="lg" fullWidth disabled={pending}>
          {isHost ? "Open room" : "Join room"}
          <ArrowRight aria-hidden className="size-5" />
        </Button>
        <p className="flex items-center justify-center gap-2 text-center text-xs text-ink-muted">
          <LockKeyhole aria-hidden className="size-3.5 shrink-0" />
          No sign-up. This room is deleted 24 hours after it was created.
        </p>
      </div>
    </form>
  );
}
