import type { RoomId } from "@/domain/room/room-identity";

export type RoomRole = "host" | "participant";

/**
 * One row of the landing page's "My rooms" list for this device (PRD 8.1, SDD section 10).
 * It holds only what the list shows; room data, keys and votes live elsewhere.
 */
export interface MyRoomEntry {
  roomId: RoomId;
  epicTitle: string;
  role: RoomRole;
  /** Milliseconds since the Unix epoch (UTC). */
  createdAt: number;
  expiresAt: number;
}

export function isRoomRole(value: unknown): value is RoomRole {
  return value === "host" || value === "participant";
}
