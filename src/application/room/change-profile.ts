import type { AvatarId } from "@/domain/avatars/avatars";
import { type Profile, validateDisplayName } from "@/domain/room/profile";

import { InvalidDisplayNameError } from "./join-room";
import type { ProfilePreferences } from "../ports/profile-preferences";
import type { RoomSession } from "../ports/room-session";

export interface ChangeProfileInput {
  displayName: string;
  avatarId: AvatarId | null;
}

export interface ChangeProfileDependencies {
  preferences: ProfilePreferences;
}

export type ChangeProfile = (session: RoomSession, input: ChangeProfileInput) => void;

/**
 * Changes this device's name and avatar in the room (FR-049). If the person chose to be
 * remembered on this device, the remembered profile follows the change (FR-055).
 */
export function makeChangeProfile({ preferences }: ChangeProfileDependencies): ChangeProfile {
  return (session, input) => {
    const name = validateDisplayName(input.displayName);
    if (!name.ok) throw new InvalidDisplayNameError();
    const profile: Profile = { displayName: name.value, avatarId: input.avatarId };

    session.updateProfile(profile);
    if (preferences.load() !== null) preferences.save(profile);
  };
}
