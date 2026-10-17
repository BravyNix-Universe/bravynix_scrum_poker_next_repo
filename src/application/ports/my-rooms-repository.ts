import type { MyRoomEntry } from "@/domain/my-rooms/my-room-entry";
import type { RoomId } from "@/domain/room/room-identity";

/** This device's "My rooms" list (SDD `storage` module). */
export interface MyRoomsRepository {
  /** Unexpired rooms, newest first. Expired entries are purged as a side effect (PRD FR-025). */
  list(now: number): MyRoomEntry[];
  /** Adds a room, or replaces the entry with the same room ID. */
  save(entry: MyRoomEntry): void;
  remove(roomId: RoomId): void;
  /** Calls `listener` after any change, including changes made in another tab. */
  subscribe(listener: () => void): () => void;
}
