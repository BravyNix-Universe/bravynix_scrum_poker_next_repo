"use client";

import { Check } from "lucide-react";
import { type FormEvent, useState } from "react";

import type { ChangeProfileInput } from "@/application/room/change-profile";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { AvatarId } from "@/domain/avatars/avatars";
import { type Profile, validateDisplayName } from "@/domain/room/profile";

import { AvatarPicker } from "./avatar-picker";
import { DisplayNameField, NAME_TOO_LONG } from "./display-name-field";

export interface ProfileDialogProps {
  open: boolean;
  profile: Profile;
  onClose: () => void;
  onSave: (input: ChangeProfileInput) => void;
}

/** Change name and avatar from inside the room (PRD FR-049). Everyone sees the change at once. */
export function ProfileDialog({ open, profile, onClose, onSave }: ProfileDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Your name and avatar"
      description="Everyone in the room sees the change straight away."
    >
      {/* Mounted only while open, so each opening starts from the current profile. */}
      {open ? <ProfileForm profile={profile} onCancel={onClose} onSave={onSave} /> : null}
    </Dialog>
  );
}

function ProfileForm({
  profile,
  onCancel,
  onSave,
}: {
  profile: Profile;
  onCancel: () => void;
  onSave: (input: ChangeProfileInput) => void;
}) {
  const [displayName, setDisplayName] = useState(profile.displayName ?? "");
  const [avatarId, setAvatarId] = useState<AvatarId | null>(profile.avatarId);
  const [nameError, setNameError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateDisplayName(displayName).ok) {
      setNameError(NAME_TOO_LONG);
      return;
    }
    onSave({ displayName, avatarId });
    onCancel();
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="mt-6 flex flex-col gap-6">
      <DisplayNameField
        value={displayName}
        onChange={(value) => {
          setDisplayName(value);
          if (nameError) setNameError(null);
        }}
        error={nameError}
      />
      <AvatarPicker value={avatarId} onChange={setAvatarId} />
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          <Check aria-hidden className="size-4" />
          Save
        </Button>
      </div>
    </form>
  );
}
