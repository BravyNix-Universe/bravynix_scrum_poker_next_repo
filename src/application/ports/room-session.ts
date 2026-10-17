import type { RoomRole } from "@/domain/my-rooms/my-room-entry";
import type { Profile } from "@/domain/room/profile";
import type { StoryId } from "@/domain/room/room";
import type { RoomId } from "@/domain/room/room-identity";
import type { CardId } from "@/domain/rules/deck";

import type { RoomSessionState } from "../room/room-view";

/**
 * A live connection to one room (SDD `room-session` module). The host's device runs the room;
 * everyone else follows it. Commands are requests: the result arrives as a new state.
 */
export interface RoomSession {
  getState(): RoomSessionState;
  /** Calls `listener` after every state change. */
  subscribe(listener: () => void): () => void;
  join(profile: Profile): Promise<void>;
  /** Host only. `title` must already pass `validateTitle`. */
  addStory(title: string): void;
  /** Host only. */
  activateStory(storyId: StoryId): void;
  /** Host only. Opens a round for the active story. */
  startEstimation(): void;
  /** Selects or changes this device's card in the open round. */
  castVote(card: CardId): void;
  /** Leaves the room and releases the connection. */
  close(): void;
}

export interface OpenRoomRequest {
  roomId: RoomId;
  role: RoomRole;
}

export type OpenRoomSession = (request: OpenRoomRequest) => RoomSession;
