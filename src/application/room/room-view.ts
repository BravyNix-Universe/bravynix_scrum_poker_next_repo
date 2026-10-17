import type { RoomRole } from "@/domain/my-rooms/my-room-entry";
import type {
  Participant,
  ParticipantId,
  RoomStatus,
  RoomTimer,
  Round,
  Story,
  StoryId,
} from "@/domain/room/room";
import type { RoomId } from "@/domain/room/room-identity";
import type { CardId } from "@/domain/rules/deck";

import { getCurrentRound, type SharedRoomState } from "../referee/room-state";

/** What a device sees before joining: enough to show the join screen (PRD 9.2 step 3). */
export interface RoomLobby {
  roomId: RoomId;
  epicTitle: string;
  createdAt: number;
  expiresAt: number;
  role: RoomRole;
  /** People online in the room right now, host included. */
  participants: readonly Participant[];
}

/** One device's view of a room it has joined. */
export interface RoomView {
  roomId: RoomId;
  epicTitle: string;
  createdAt: number;
  expiresAt: number;
  status: RoomStatus;
  endedAt: number | null;
  me: ParticipantId;
  /** Everyone who has joined, online or not (PRD 12.4). */
  participants: readonly Participant[];
  /** In queue order, removed stories included. */
  stories: readonly Story[];
  activeStoryId: StoryId | null;
  /** The open or last round of the active story since it was activated, if any. */
  round: Round | null;
  /** Every round in the room, oldest first, for History (FR-020). */
  rounds: readonly Round[];
  timer: RoomTimer | null;
  /** This device's own selection in the open round. Never shared before reveal. */
  myVote: CardId | null;
}

/** The device's view of a room. Seals and openings stay with the referee. */
export function toRoomView(
  state: SharedRoomState,
  me: ParticipantId,
  myVote: CardId | null,
): RoomView {
  return {
    roomId: state.roomId,
    epicTitle: state.epicTitle,
    createdAt: state.createdAt,
    expiresAt: state.expiresAt,
    status: state.status,
    endedAt: state.endedAt,
    me,
    participants: state.participants,
    stories: state.stories,
    activeStoryId: state.activeStoryId,
    round: getCurrentRound(state),
    rounds: state.rounds,
    timer: state.timer,
    myVote,
  };
}

export function toRoomLobby(state: SharedRoomState, role: RoomRole): RoomLobby {
  return {
    roomId: state.roomId,
    epicTitle: state.epicTitle,
    createdAt: state.createdAt,
    expiresAt: state.expiresAt,
    role,
    participants: state.participants.filter((person) => person.online),
  };
}
