import type { ProfilePreferences } from "@/application/ports/profile-preferences";
import type { Profile } from "@/domain/room/profile";

export function createInMemoryProfilePreferences(initial: Profile | null = null) {
  let saved = initial;
  return {
    load: () => saved,
    save: (profile: Profile) => void (saved = profile),
    clear: () => void (saved = null),
  } satisfies ProfilePreferences;
}
