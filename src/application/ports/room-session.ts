import type { RoomRole } from "@/domain/my-rooms/my-room-entry";
import type { Profile } from "@/domain/room/profile";
import type { StoryId } from "@/domain/room/room";
import type { RoomId } from "@/domain/room/room-identity";
import type { CardId } from "@/domain/rules/deck";

import type { RoomSessionState } from "../room/room-view";

/**
 * A live connection to one room (SDD `room-session` module). The host's device runs the room;
 * everyone else follows it. Commands are requests: the result arrives as a new state, and the
 * referee may refuse one (PRD 8.7). The UI only offers commands the referee would accept.
 */
export interface RoomSession {
  getState(): RoomSessionState;
  /** Calls `listener` after every state change. */
  subscribe(listener: () => void): () => void;
  join(profile: Profile): Promise<void>;
  /** Changes this device's name and avatar while the room is active (FR-049). */
  updateProfile(profile: Profile): void;

  /** Host only. Titles must already pass `validateTitle`. */
  addStory(title: string): void;
  renameStory(storyId: StoryId, title: string): void;
  /** Host only. `toIndex` counts visible (not removed) stories. */
  moveStory(storyId: StoryId, toIndex: number): void;
  removeStory(storyId: StoryId): void;
  restoreStory(storyId: StoryId): void;
  /** Host only, for stories with no rounds (FR-039). */
  deleteStory(storyId: StoryId): void;
  /** Host only. Cancels a VOTING round (FR-041). */
  activateStory(storyId: StoryId): void;

  /** Host only. Opens the first or next round for the active story, cancelling a VOTING one. */
  startRound(): void;
  /** Selects or changes this device's card in the open round. */
  castVote(card: CardId): void;
  /** Host only. Closes voting and opens every sealed vote (PRD 9.3). */
  reveal(): void;

  /** Host only. `durationMs` must pass `isValidTimerDuration`. */
  startTimer(durationMs: number): void;
  stopTimer(): void;
  /** Host only. Makes the room read-only (FR-022). */
  endRoom(): void;

  /** Leaves the room and releases the connection. */
  close(): void;
}

export interface OpenRoomRequest {
  roomId: RoomId;
  role: RoomRole;
}

export type OpenRoomSession = (request: OpenRoomRequest) => RoomSession;
