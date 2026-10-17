import type { Profile } from "@/domain/room/profile";

/** "Remember my name and avatar on this device" (PRD FR-055). Off unless the person opts in. */
export interface ProfilePreferences {
  load(): Profile | null;
  save(profile: Profile): void;
  clear(): void;
}
