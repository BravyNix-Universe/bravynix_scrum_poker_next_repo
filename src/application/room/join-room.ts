import type { AvatarId } from "@/domain/avatars/avatars";
import { type Profile, validateDisplayName } from "@/domain/room/profile";

import { listRoom } from "./list-room";
import type { MyRoomsRepository } from "../ports/my-rooms-repository";
import type { ProfilePreferences } from "../ports/profile-preferences";
import type { RoomSession } from "../ports/room-session";

export interface JoinRoomInput {
  displayName: string;
  avatarId: AvatarId | null;
  remember: boolean;
}

export class InvalidDisplayNameError extends Error {
  constructor() {
    super("Display name is too long");
    this.name = "InvalidDisplayNameError";
  }
}

export interface JoinRoomDependencies {
  myRooms: MyRoomsRepository;
  preferences: ProfilePreferences;
  now: () => number;
}

export type JoinRoom = (session: RoomSession, input: JoinRoomInput) => Promise<void>;

/**
 * Joins with an optional name and avatar (PRD 9.2), remembers them only if asked (FR-055) and
 * lists the room under "My rooms" (PRD 8.1).
 */
export function makeJoinRoom({ myRooms, preferences, now }: JoinRoomDependencies): JoinRoom {
  return async (session, input) => {
    const state = session.getState();
    if (state.status !== "lobby") throw new Error("Joining needs a room in the lobby state");

    const name = validateDisplayName(input.displayName);
    if (!name.ok) throw new InvalidDisplayNameError();
    const profile: Profile = { displayName: name.value, avatarId: input.avatarId };

    if (input.remember) preferences.save(profile);
    else preferences.clear();

    await session.join(profile);

    const { lobby } = state;
    listRoom(
      myRooms,
      {
        roomId: lobby.roomId,
        epicTitle: lobby.epicTitle,
        role: lobby.role,
        createdAt: lobby.createdAt,
        expiresAt: lobby.expiresAt,
      },
      now(),
    );
  };
}
