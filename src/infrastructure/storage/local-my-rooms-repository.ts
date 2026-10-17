import type { MyRoomsRepository } from "@/application/ports/my-rooms-repository";
import { isRoomRole, type MyRoomEntry } from "@/domain/my-rooms/my-room-entry";
import { isRoomId } from "@/domain/room/room-identity";
import { isExpired } from "@/domain/rules/lifecycle";

import type { KeyValueStorage } from "./browser-storage";

export const MY_ROOMS_STORAGE_KEY = "bvx:my-rooms:v1";

/**
 * "My rooms" kept in Web Storage. A null `storage` (private browsing, blocked site data) gives
 * an always-empty list, because the list is a convenience and must never block creating a room.
 */
export function createLocalMyRoomsRepository(storage: KeyValueStorage | null): MyRoomsRepository {
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());

  function read(): MyRoomEntry[] {
    if (!storage) return [];
    try {
      const parsed: unknown = JSON.parse(storage.getItem(MY_ROOMS_STORAGE_KEY) ?? "[]");
      return Array.isArray(parsed) ? parsed.filter(isMyRoomEntry) : [];
    } catch {
      return [];
    }
  }

  function write(entries: MyRoomEntry[]): void {
    if (!storage) return;
    try {
      if (entries.length === 0) storage.removeItem(MY_ROOMS_STORAGE_KEY);
      else storage.setItem(MY_ROOMS_STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // Quota or access errors: the list is a convenience, so failing quietly is acceptable.
    }
  }

  function onStorage(event: StorageEvent): void {
    if (event.key === null || event.key === MY_ROOMS_STORAGE_KEY) notify();
  }

  return {
    list(now) {
      const entries = read();
      const live = entries.filter((entry) => !isExpired(entry.expiresAt, now));
      if (live.length !== entries.length) write(live);
      return live.sort((a, b) => b.createdAt - a.createdAt);
    },
    save(entry) {
      write([entry, ...read().filter((existing) => existing.roomId !== entry.roomId)]);
      notify();
    },
    remove(roomId) {
      write(read().filter((entry) => entry.roomId !== roomId));
      notify();
    },
    subscribe(listener) {
      // Other tabs on this device change the same list (the `storage` event fires only there).
      if (listeners.size === 0 && typeof window !== "undefined") {
        window.addEventListener("storage", onStorage);
      }
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && typeof window !== "undefined") {
          window.removeEventListener("storage", onStorage);
        }
      };
    },
  };
}

/** Stored data is untrusted: another tab, an extension or an old version may have written it. */
function isMyRoomEntry(value: unknown): value is MyRoomEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.roomId === "string" &&
    isRoomId(entry.roomId) &&
    typeof entry.epicTitle === "string" &&
    isRoomRole(entry.role) &&
    typeof entry.createdAt === "number" &&
    typeof entry.expiresAt === "number"
  );
}
