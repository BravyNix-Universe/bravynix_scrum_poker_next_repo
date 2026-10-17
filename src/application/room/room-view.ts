import type { RoomRole } from "@/domain/my-rooms/my-room-entry";
import type {
  Participant,
  ParticipantId,
  RoomStatus,
  Round,
  Story,
  StoryId,
} from "@/domain/room/room";
import type { RoomId } from "@/domain/room/room-identity";
import type { CardId } from "@/domain/rules/deck";

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
  me: ParticipantId;
  /** Everyone who has joined, online or not (PRD 12.4). */
  participants: readonly Participant[];
  /** In queue order. */
  stories: readonly Story[];
  activeStoryId: StoryId | null;
  /** The open or last round of the active story since it was activated, if any. */
  round: Round | null;
  /** This device's own selection in the open round. Never shared before reveal. */
  myVote: CardId | null;
}

export type RoomSessionState =
  | { status: "connecting" }
  | { status: "lobby"; lobby: RoomLobby }
  | { status: "joined"; view: RoomView }
  | { status: "unavailable" };
