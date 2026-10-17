import type { MyRoomsRepository } from "@/application/ports/my-rooms-repository";
import type { MyRoomEntry } from "@/domain/my-rooms/my-room-entry";
import { isExpired } from "@/domain/rules/lifecycle";

/** A test double for `MyRoomsRepository` that keeps entries in memory. */
export function createInMemoryMyRoomsRepository(): MyRoomsRepository & {
  entries: MyRoomEntry[];
} {
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());

  const repository = {
    entries: [] as MyRoomEntry[],
    list(now: number) {
      repository.entries = repository.entries.filter((entry) => !isExpired(entry.expiresAt, now));
      return [...repository.entries].sort((a, b) => b.createdAt - a.createdAt);
    },
    save(entry: MyRoomEntry) {
      repository.entries = [
        entry,
        ...repository.entries.filter((existing) => existing.roomId !== entry.roomId),
      ];
      notify();
    },
    remove(roomId: MyRoomEntry["roomId"]) {
      repository.entries = repository.entries.filter((entry) => entry.roomId !== roomId);
      notify();
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
  return repository;
}
