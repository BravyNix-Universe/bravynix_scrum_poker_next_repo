import type { RoomId } from "@/domain/room/room-identity";

import type { MyRoomsRepository } from "../ports/my-rooms-repository";
import type { RoomStore } from "../ports/room-store";

export interface ForgetRoomDependencies {
  myRooms: MyRoomsRepository;
  store: RoomStore;
}

export type ForgetRoom = (roomId: RoomId) => Promise<void>;

/**
 * "Delete from this device" (PRD 13, SDD 13.3 T-10): the room leaves "My rooms", and its
 * record, host key, identity and vote are deleted here. Other devices keep their copies.
 */
export function makeForgetRoom({ myRooms, store }: ForgetRoomDependencies): ForgetRoom {
  return async (roomId) => {
    myRooms.remove(roomId);
    await store.deleteRoom(roomId);
  };
}
