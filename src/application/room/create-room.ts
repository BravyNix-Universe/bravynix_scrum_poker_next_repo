import type { EncodedHostKey, RoomId } from "@/domain/room/room-identity";
import { roomExpiresAt } from "@/domain/rules/lifecycle";
import { type TitleError, validateTitle } from "@/domain/rules/text";

import type { MyRoomsRepository } from "../ports/my-rooms-repository";
import type { RoomKeyService } from "../ports/room-key-service";

export interface CreatedRoom {
  roomId: RoomId;
  epicTitle: string;
  /** Milliseconds since the Unix epoch (UTC). */
  createdAt: number;
  /** Fixed at creation + 24 hours and never extended (PRD FR-023). */
  expiresAt: number;
  hostKey: EncodedHostKey;
}

export class InvalidEpicTitleError extends Error {
  constructor(readonly reason: TitleError) {
    super(`Invalid Epic title: ${reason}`);
    this.name = "InvalidEpicTitleError";
  }
}

export interface CreateRoomDependencies {
  roomKeys: RoomKeyService;
  myRooms: MyRoomsRepository;
  now: () => number;
}

export type CreateRoom = (epicTitle: string) => Promise<CreatedRoom>;

/**
 * Creates a room entirely on this device and lists it under "My rooms" as host (PRD 9.1 step 2).
 * Nothing is sent anywhere.
 */
export function makeCreateRoom({ roomKeys, myRooms, now }: CreateRoomDependencies): CreateRoom {
  return async (epicTitle) => {
    const title = validateTitle(epicTitle);
    if (!title.ok) throw new InvalidEpicTitleError(title.error);

    const { roomId, hostKey } = await roomKeys.createIdentity();
    const createdAt = now();
    const room: CreatedRoom = {
      roomId,
      epicTitle: title.value,
      createdAt,
      expiresAt: roomExpiresAt(createdAt),
      hostKey,
    };

    myRooms.save({
      roomId,
      epicTitle: room.epicTitle,
      role: "host",
      createdAt,
      expiresAt: room.expiresAt,
    });
    return room;
  };
}
