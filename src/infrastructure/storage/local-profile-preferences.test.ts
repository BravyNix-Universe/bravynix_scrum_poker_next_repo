import { describe, expect, it } from "vitest";

import type { KeyValueStorage } from "./browser-storage";
import {
  createLocalProfilePreferences,
  PROFILE_PREFERENCES_KEY,
} from "./local-profile-preferences";

function memoryStorage(): KeyValueStorage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

describe("local profile preferences", () => {
  it("saves, loads and clears the remembered profile", () => {
    const preferences = createLocalProfilePreferences(memoryStorage());
    expect(preferences.load()).toBeNull();

    preferences.save({ displayName: "Arjun", avatarId: "tiger" });
    expect(preferences.load()).toEqual({ displayName: "Arjun", avatarId: "tiger" });

    preferences.clear();
    expect(preferences.load()).toBeNull();
  });

  it("drops invalid stored values", () => {
    const storage = memoryStorage();
    storage.setItem(
      PROFILE_PREFERENCES_KEY,
      JSON.stringify({ displayName: "a".repeat(40), avatarId: "coffee" }),
    );
    expect(createLocalProfilePreferences(storage).load()).toEqual({
      displayName: null,
      avatarId: null,
    });

    storage.setItem(PROFILE_PREFERENCES_KEY, "{broken");
    expect(createLocalProfilePreferences(storage).load()).toBeNull();
  });

  it("works without storage", () => {
    const preferences = createLocalProfilePreferences(null);
    preferences.save({ displayName: "Arjun", avatarId: null });
    expect(preferences.load()).toBeNull();
  });
});
