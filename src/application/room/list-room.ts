import type { MyRoomEntry } from "@/domain/my-rooms/my-room-entry";

import type { MyRoomsRepository } from "../ports/my-rooms-repository";

/**
 * Lists a room under "My rooms" once this device is in it (PRD 8.1). A room this device hosts
 * stays listed as hosted, even if the device later joins it as someone else.
 */
export function listRoom(myRooms: MyRoomsRepository, entry: MyRoomEntry, now: number): void {
  const listed = myRooms.list(now).find((room) => room.roomId === entry.roomId);
  if (listed?.role === "host" && entry.role !== "host") return;
  myRooms.save(entry);
}
