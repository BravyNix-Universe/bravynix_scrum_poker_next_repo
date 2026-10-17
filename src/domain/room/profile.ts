import type { AvatarId } from "@/domain/avatars/avatars";
import { LIMITS } from "@/domain/rules/limits";
import { countCharacters } from "@/domain/rules/text";

export const ANONYMOUS_NAME = "Anonymous";

/** How a person appears in the room. Both parts are optional (PRD FR-005). */
export interface Profile {
  displayName: string | null;
  avatarId: AvatarId | null;
}

export type DisplayNameResult =
  { ok: true; value: string | null } | { ok: false; error: "too-long" };

/**
 * A blank name means Anonymous. Otherwise 1 to 32 characters after trimming, in any language,
 * with duplicates allowed (PRD FR-005, D-06).
 */
export function validateDisplayName(raw: string): DisplayNameResult {
  const value = raw.trim();
  if (value === "") return { ok: true, value: null };
  if (countCharacters(value) > LIMITS.displayNameMaxLength) return { ok: false, error: "too-long" };
  return { ok: true, value };
}

export function displayNameOf(profile: Pick<Profile, "displayName">): string {
  return profile.displayName ?? ANONYMOUS_NAME;
}
