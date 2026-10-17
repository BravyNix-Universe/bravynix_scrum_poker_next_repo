// @vitest-environment node
import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";

import type { HostRoomRecord } from "@/application/ports/room-store";
import { createRoomState } from "@/application/referee/room-state";
import type { ParticipantId, RoundId } from "@/domain/room/room";
import type { EncodedHostKey, RoomId } from "@/domain/room/room-identity";

import { createBrowserRoomStore, createIndexedDbRoomStore } from "./indexed-db-room-store";

const NOW = Date.UTC(2026, 9, 17, 6, 0, 0);
const ROOM = "k7Qx9mP2vT4w" as RoomId;
const OTHER = "Zz9Yy8Xx7Ww6" as RoomId;

function record(roomId: RoomId, expiresAt: number): HostRoomRecord {
  const state = createRoomState({ roomId, epicTitle: "Checkout revamp", createdAt: NOW });
  return {
    kind: "host",
    roomId,
    version: 2,
    state: { ...state, expiresAt },
    tokenHashes: {},
    expiresAt,
  };
}

describe("IndexedDB room store (SDD 10, ADR-07)", () => {
  it("keeps each kind of room data, keyed by room", async () => {
    const store = createIndexedDbRoomStore(new IDBFactory());
    const expiresAt = NOW + 1_000;

    await store.saveRoom(record(ROOM, expiresAt));
    await store.saveHostKey(ROOM, "k".repeat(128) as EncodedHostKey, expiresAt);
    await store.saveMembership(
      ROOM,
      { participantId: "p1" as ParticipantId, token: "t" },
      expiresAt,
    );
    await store.saveVote(
      ROOM,
      { roundId: "r1" as RoundId, card: "5", salt: "s", replaced: null },
      expiresAt,
    );

    await expect(store.getRoom(ROOM)).resolves.toMatchObject({ kind: "host", version: 2 });
    await expect(store.getHostKey(ROOM)).resolves.toBe("k".repeat(128));
    await expect(store.getMembership(ROOM)).resolves.toEqual({ participantId: "p1", token: "t" });
    await expect(store.getVote(ROOM)).resolves.toMatchObject({ card: "5" });
    await expect(store.getRoom(OTHER)).resolves.toBeNull();

    await store.deleteVote(ROOM);
    await expect(store.getVote(ROOM)).resolves.toBeNull();
  });

  it("deletes everything for a room, and every room past its deadline (FR-023)", async () => {
    const store = createIndexedDbRoomStore(new IDBFactory());
    await store.saveRoom(record(ROOM, NOW - 1));
    await store.saveHostKey(ROOM, "k".repeat(128) as EncodedHostKey, NOW - 1);
    await store.saveRoom(record(OTHER, NOW + 1_000));

    await store.purgeExpired(NOW);
    await expect(store.getRoom(ROOM)).resolves.toBeNull();
    await expect(store.getHostKey(ROOM)).resolves.toBeNull();
    await expect(store.getRoom(OTHER)).resolves.not.toBeNull();

    await store.deleteRoom(OTHER);
    await expect(store.getRoom(OTHER)).resolves.toBeNull();
  });

  it("falls back to memory where IndexedDB is unavailable", async () => {
    const store = createBrowserRoomStore(undefined);
    await store.saveRoom(record(ROOM, NOW + 1_000));
    await expect(store.getRoom(ROOM)).resolves.toMatchObject({ roomId: ROOM });
  });
});
