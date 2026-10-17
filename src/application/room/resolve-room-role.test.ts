import { describe, expect, it } from "vitest";

import type { EncodedHostKey, RoomId } from "@/domain/room/room-identity";
import { createInMemoryMyRoomsRepository } from "@/test/fakes/in-memory-my-rooms-repository";

import { makeResolveRoomRole } from "./resolve-room-role";

const NOW = Date.UTC(2026, 9, 17, 6, 0, 0);
const ROOM_ID = "k7Qx9mP2vT4w" as RoomId;

function setup() {
  const myRooms = createInMemoryMyRoomsRepository();
  return { myRooms, resolveRole: makeResolveRoomRole({ myRooms, now: () => NOW }) };
}

describe("resolveRoomRole", () => {
  it("hosts when the link carries the host key (PRD 9.7)", () => {
    const { resolveRole } = setup();
    expect(resolveRole({ roomId: ROOM_ID, hostKey: "A".repeat(128) as EncodedHostKey })).toBe(
      "host",
    );
  });

  it("hosts a room this device created, and joins any other room as a participant", () => {
    const { myRooms, resolveRole } = setup();
    expect(resolveRole({ roomId: ROOM_ID, hostKey: null })).toBe("participant");

    myRooms.save({
      roomId: ROOM_ID,
      epicTitle: "Checkout revamp",
      role: "host",
      createdAt: NOW,
      expiresAt: NOW + 1000,
    });
    expect(resolveRole({ roomId: ROOM_ID, hostKey: null })).toBe("host");
  });
});
