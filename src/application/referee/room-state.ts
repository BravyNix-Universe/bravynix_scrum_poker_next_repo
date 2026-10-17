import type {
  Participant,
  ParticipantId,
  RoomStatus,
  RoomTimer,
  Round,
  RoundId,
  Story,
  StoryId,
} from "@/domain/room/room";
import type { RoomId } from "@/domain/room/room-identity";
import type { CardId } from "@/domain/rules/deck";
import { roomExpiresAt } from "@/domain/rules/lifecycle";

/** A vote opened at reveal: the card the voter's device kept private until then (PRD 11.4). */
export interface Opening {
  participantId: ParticipantId;
  card: CardId;
}

/** The authoritative record of one room, held by the referee on the host's device (SDD 10). */
export interface RoomState {
  roomId: RoomId;
  epicTitle: string;
  createdAt: number;
  expiresAt: number;
  status: RoomStatus;
  endedAt: number | null;
  /** Everyone who has joined, host first (PRD 12.4). */
  participants: readonly Participant[];
  /** Queue order, removed stories included. */
  stories: readonly Story[];
  activeStoryId: StoryId | null;
  /** Every round in the room, oldest first. */
  rounds: readonly Round[];
  /** The open or last round of the active story since it was activated. */
  currentRoundId: RoundId | null;
  timer: RoomTimer | null;
  /** Openings received while the current round is REVEALING; empty otherwise. */
  openings: readonly Opening[];
}

export interface NewRoomState {
  roomId: RoomId;
  epicTitle: string;
  createdAt: number;
}

export function createRoomState({ roomId, epicTitle, createdAt }: NewRoomState): RoomState {
  return {
    roomId,
    epicTitle,
    createdAt,
    expiresAt: roomExpiresAt(createdAt),
    status: "active",
    endedAt: null,
    participants: [],
    stories: [],
    activeStoryId: null,
    rounds: [],
    currentRoundId: null,
    timer: null,
    openings: [],
  };
}

export function getHost(state: RoomState): Participant | null {
  return state.participants.find((person) => person.isHost) ?? null;
}

export function getCurrentRound(state: RoomState): Round | null {
  return state.rounds.find((round) => round.id === state.currentRoundId) ?? null;
}
