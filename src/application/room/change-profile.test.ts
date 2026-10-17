import { describe, expect, it } from "vitest";

import { createFakeRoomSession } from "@/test/fakes/fake-room-session";
import { createInMemoryProfilePreferences } from "@/test/fakes/in-memory-profile-preferences";

import { makeChangeProfile } from "./change-profile";
import { InvalidDisplayNameError } from "./join-room";

describe("changeProfile (FR-049)", () => {
  it("sends the trimmed name and avatar to the room", () => {
    const session = createFakeRoomSession();
    makeChangeProfile({ preferences: createInMemoryProfilePreferences() })(session, {
      displayName: "  Meera ",
      avatarId: "fox",
    });
    expect(session.updateProfile).toHaveBeenCalledWith({ displayName: "Meera", avatarId: "fox" });
  });

  it("updates the remembered profile only if one is saved (FR-055)", () => {
    const remembered = createInMemoryProfilePreferences({ displayName: "Old", avatarId: null });
    makeChangeProfile({ preferences: remembered })(createFakeRoomSession(), {
      displayName: "",
      avatarId: "owl",
    });
    expect(remembered.load()).toEqual({ displayName: null, avatarId: "owl" });

    const forgotten = createInMemoryProfilePreferences();
    makeChangeProfile({ preferences: forgotten })(createFakeRoomSession(), {
      displayName: "Meera",
      avatarId: null,
    });
    expect(forgotten.load()).toBeNull();
  });

  it("refuses a name over 32 characters", () => {
    const session = createFakeRoomSession();
    expect(() =>
      makeChangeProfile({ preferences: createInMemoryProfilePreferences() })(session, {
        displayName: "x".repeat(33),
        avatarId: null,
      }),
    ).toThrow(InvalidDisplayNameError);
    expect(session.updateProfile).not.toHaveBeenCalled();
  });
});
