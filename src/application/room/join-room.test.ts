import { describe, expect, it } from "vitest";

import { createFakeRoomSession, FAKE_LOBBY } from "@/test/fakes/fake-room-session";
import { createInMemoryMyRoomsRepository } from "@/test/fakes/in-memory-my-rooms-repository";
import { createInMemoryProfilePreferences } from "@/test/fakes/in-memory-profile-preferences";

import { InvalidDisplayNameError, makeJoinRoom } from "./join-room";

const NOW = FAKE_LOBBY.createdAt + 60_000;

function setup() {
  const myRooms = createInMemoryMyRoomsRepository();
  const preferences = createInMemoryProfilePreferences();
  const joinRoom = makeJoinRoom({ myRooms, preferences, now: () => NOW });
  return { joinRoom, myRooms, preferences, session: createFakeRoomSession() };
}

describe("joinRoom", () => {
  it("joins with a trimmed name and avatar and lists the room under My rooms", async () => {
    const { joinRoom, myRooms, session } = setup();
    await joinRoom(session, { displayName: " Arjun ", avatarId: "tiger", remember: false });

    expect(session.join).toHaveBeenCalledWith({ displayName: "Arjun", avatarId: "tiger" });
    expect(myRooms.list(NOW)).toEqual([
      expect.objectContaining({ roomId: FAKE_LOBBY.roomId, role: "participant" }),
    ]);
  });

  it("joins as Anonymous with no avatar when both are skipped (PRD 9.2)", async () => {
    const { joinRoom, session } = setup();
    await joinRoom(session, { displayName: "", avatarId: null, remember: false });
    expect(session.join).toHaveBeenCalledWith({ displayName: null, avatarId: null });
  });

  it("remembers the profile only when asked (PRD FR-055)", async () => {
    const { joinRoom, preferences } = setup();
    await joinRoom(createFakeRoomSession(), {
      displayName: "Arjun",
      avatarId: null,
      remember: true,
    });
    expect(preferences.load()).toEqual({ displayName: "Arjun", avatarId: null });

    await joinRoom(createFakeRoomSession(), {
      displayName: "Arjun",
      avatarId: null,
      remember: false,
    });
    expect(preferences.load()).toBeNull();
  });

  it("refuses a name over 32 characters without joining", async () => {
    const { joinRoom, session } = setup();
    await expect(
      joinRoom(session, { displayName: "a".repeat(33), avatarId: null, remember: false }),
    ).rejects.toBeInstanceOf(InvalidDisplayNameError);
    expect(session.join).not.toHaveBeenCalled();
  });

  it("keeps the host's own My rooms entry as host", async () => {
    const { joinRoom, myRooms } = setup();
    myRooms.save({ ...FAKE_LOBBY, role: "host" });
    await joinRoom(
      createFakeRoomSession({ status: "lobby", lobby: { ...FAKE_LOBBY, role: "host" } }),
      {
        displayName: "Priya",
        avatarId: "panda",
        remember: false,
      },
    );
    expect(myRooms.list(NOW)).toEqual([expect.objectContaining({ role: "host" })]);
  });
});
