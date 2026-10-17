import type { RoomRole } from "@/domain/my-rooms/my-room-entry";
import type { RoomFragment } from "@/domain/room/room-links";

import type { MyRoomsRepository } from "../ports/my-rooms-repository";

export interface ResolveRoomRoleDependencies {
  myRooms: MyRoomsRepository;
  now: () => number;
}

export type ResolveRoomRole = (fragment: RoomFragment) => RoomRole;

/** A device hosts a room when it opened the host link or created the room (PRD 9.1, 9.7). */
export function makeResolveRoomRole({
  myRooms,
  now,
}: ResolveRoomRoleDependencies): ResolveRoomRole {
  return (fragment) => {
    if (fragment.hostKey) return "host";
    const entry = myRooms.list(now()).find((room) => room.roomId === fragment.roomId);
    return entry?.role ?? "participant";
  };
}
