import { describe, expect, it, vi } from "vitest";

import type { MyRoomEntry } from "@/domain/my-rooms/my-room-entry";
import type { RoomId } from "@/domain/room/room-identity";

import type { KeyValueStorage } from "./browser-storage";
import { createLocalMyRoomsRepository, MY_ROOMS_STORAGE_KEY } from "./local-my-rooms-repository";

const HOUR = 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 17, 12, 0, 0);

function memoryStorage(): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  };
}

function entry(
  roomId: string,
  createdAt: number,
  overrides: Partial<MyRoomEntry> = {},
): MyRoomEntry {
  return {
    roomId: roomId as RoomId,
    epicTitle: `Epic ${roomId}`,
    role: "host",
    createdAt,
    expiresAt: createdAt + 24 * HOUR,
    ...overrides,
  };
}

describe("local My rooms repository", () => {
  it("lists saved rooms newest first", () => {
    const store = createLocalMyRoomsRepository(memoryStorage());
    store.save(entry("aaaaaaaaaaaa", NOW - 2 * HOUR));
    store.save(entry("bbbbbbbbbbbb", NOW - HOUR));
    expect(store.list(NOW).map((room) => room.roomId)).toEqual(["bbbbbbbbbbbb", "aaaaaaaaaaaa"]);
  });

  it("purges each room at its own deadline (PRD 18.6.5)", () => {
    const storage = memoryStorage();
    const store = createLocalMyRoomsRepository(storage);
    store.save(entry("aaaaaaaaaaaa", NOW - 25 * HOUR));
    store.save(entry("bbbbbbbbbbbb", NOW - 23 * HOUR));

    expect(store.list(NOW).map((room) => room.roomId)).toEqual(["bbbbbbbbbbbb"]);
    expect(storage.data.get(MY_ROOMS_STORAGE_KEY)).not.toContain("aaaaaaaaaaaa");
  });

  it("replaces an entry with the same room ID instead of duplicating it", () => {
    const store = createLocalMyRoomsRepository(memoryStorage());
    store.save(entry("aaaaaaaaaaaa", NOW, { role: "participant" }));
    store.save(entry("aaaaaaaaaaaa", NOW, { role: "host" }));
    expect(store.list(NOW)).toHaveLength(1);
    expect(store.list(NOW)[0]?.role).toBe("host");
  });

  it("removes a room and notifies subscribers", () => {
    const store = createLocalMyRoomsRepository(memoryStorage());
    const listener = vi.fn();
    store.subscribe(listener);
    store.save(entry("aaaaaaaaaaaa", NOW));
    store.remove("aaaaaaaaaaaa" as RoomId);
    expect(store.list(NOW)).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("ignores corrupt or tampered data", () => {
    const storage = memoryStorage();
    storage.setItem(
      MY_ROOMS_STORAGE_KEY,
      JSON.stringify([{ roomId: "<script>", role: "host" }, entry("aaaaaaaaaaaa", NOW)]),
    );
    expect(
      createLocalMyRoomsRepository(storage)
        .list(NOW)
        .map((room) => room.roomId),
    ).toEqual(["aaaaaaaaaaaa"]);

    storage.setItem(MY_ROOMS_STORAGE_KEY, "{not json");
    expect(createLocalMyRoomsRepository(storage).list(NOW)).toEqual([]);
  });

  it("works without storage (private browsing)", () => {
    const store = createLocalMyRoomsRepository(null);
    store.save(entry("aaaaaaaaaaaa", NOW));
    expect(store.list(NOW)).toEqual([]);
  });

  it("notifies subscribers when another tab changes the list", () => {
    const store = createLocalMyRoomsRepository(memoryStorage());
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    window.dispatchEvent(new StorageEvent("storage", { key: MY_ROOMS_STORAGE_KEY }));
    window.dispatchEvent(new StorageEvent("storage", { key: "unrelated" }));
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    window.dispatchEvent(new StorageEvent("storage", { key: MY_ROOMS_STORAGE_KEY }));
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
