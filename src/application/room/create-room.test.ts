import { describe, expect, it, vi } from "vitest";

import type { RoomKeyService } from "@/application/ports/room-key-service";
import type { EncodedHostKey, RoomId } from "@/domain/room/room-identity";
import { LIMITS } from "@/domain/rules/limits";
import { createInMemoryMyRoomsRepository } from "@/test/fakes/in-memory-my-rooms-repository";

import { InvalidEpicTitleError, makeCreateRoom } from "./create-room";

const NOW = Date.UTC(2026, 9, 17, 4, 0, 0);
const IDENTITY = {
  roomId: "k7Qx9mP2vT4w" as RoomId,
  hostKey: "A".repeat(128) as EncodedHostKey,
};

function setup() {
  const roomKeys: RoomKeyService = { createIdentity: vi.fn(async () => IDENTITY) };
  const myRooms = createInMemoryMyRoomsRepository();
  const createRoom = makeCreateRoom({ roomKeys, myRooms, now: () => NOW });
  return { createRoom, myRooms, roomKeys };
}

describe("createRoom", () => {
  it("creates a room that expires 24 hours after creation (PRD FR-023)", async () => {
    const { createRoom } = setup();
    const room = await createRoom("  Checkout revamp ");

    expect(room).toEqual({
      ...IDENTITY,
      epicTitle: "Checkout revamp",
      createdAt: NOW,
      expiresAt: NOW + LIMITS.roomLifetimeMs,
    });
  });

  it("lists the new room under My rooms as host, without the host key", async () => {
    const { createRoom, myRooms } = setup();
    await createRoom("Checkout revamp");

    expect(myRooms.list(NOW)).toEqual([
      {
        roomId: IDENTITY.roomId,
        epicTitle: "Checkout revamp",
        role: "host",
        createdAt: NOW,
        expiresAt: NOW + LIMITS.roomLifetimeMs,
      },
    ]);
  });

  it("refuses an invalid Epic title before creating any keys", async () => {
    const { createRoom, roomKeys, myRooms } = setup();

    await expect(createRoom("   ")).rejects.toBeInstanceOf(InvalidEpicTitleError);
    await expect(createRoom("a".repeat(LIMITS.titleMaxLength + 1))).rejects.toMatchObject({
      reason: "too-long",
    });
    expect(roomKeys.createIdentity).not.toHaveBeenCalled();
    expect(myRooms.list(NOW)).toEqual([]);
  });
});
