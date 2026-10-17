import type { ProfilePreferences } from "@/application/ports/profile-preferences";
import { isAvatarId } from "@/domain/avatars/avatars";
import { type Profile, validateDisplayName } from "@/domain/room/profile";

import type { KeyValueStorage } from "./browser-storage";

export const PROFILE_PREFERENCES_KEY = "bvx:prefs:v1";

/** The last-used name and avatar, kept in Web Storage only when the person opts in. */
export function createLocalProfilePreferences(storage: KeyValueStorage | null): ProfilePreferences {
  return {
    load() {
      if (!storage) return null;
      try {
        return parseProfile(JSON.parse(storage.getItem(PROFILE_PREFERENCES_KEY) ?? "null"));
      } catch {
        return null;
      }
    },
    save(profile) {
      try {
        storage?.setItem(PROFILE_PREFERENCES_KEY, JSON.stringify(profile));
      } catch {
        // A convenience only: failing quietly is acceptable.
      }
    },
    clear() {
      try {
        storage?.removeItem(PROFILE_PREFERENCES_KEY);
      } catch {
        // As above.
      }
    },
  };
}

/** Stored data is untrusted, so it is checked against the same rules as typed input. */
function parseProfile(value: unknown): Profile | null {
  if (typeof value !== "object" || value === null) return null;
  const { displayName, avatarId } = value as Record<string, unknown>;
  const name = typeof displayName === "string" ? validateDisplayName(displayName) : null;
  return {
    displayName: name?.ok ? name.value : null,
    avatarId: isAvatarId(avatarId) ? avatarId : null,
  };
}
