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

/** A sealed vote: the fingerprint of a card and a secret salt, which can't be reversed. */
export interface Seal {
  participantId: ParticipantId;
  seal: string;
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
  /** Seals cast in the current round while it is open. Held by the host only (SDD 10). */
  seals: readonly Seal[];
  /** Openings received while the current round is REVEALING; empty otherwise. */
  openings: readonly Opening[];
}

/**
 * The part of the room every device holds a signed copy of. Seals and openings stay on the
 * host's device: nobody learns a card before the round is revealed (PRD 14.2).
 */
export type SharedRoomState = Omit<RoomState, "seals" | "openings">;

/** Listed field by field: the compiler then flags any field added to the room but not here. */
export function toSharedState(state: RoomState): SharedRoomState {
  return {
    roomId: state.roomId,
    epicTitle: state.epicTitle,
    createdAt: state.createdAt,
    expiresAt: state.expiresAt,
    status: state.status,
    endedAt: state.endedAt,
    participants: state.participants,
    stories: state.stories,
    activeStoryId: state.activeStoryId,
    rounds: state.rounds,
    currentRoundId: state.currentRoundId,
    timer: state.timer,
  };
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
    seals: [],
    openings: [],
  };
}

export function getHost(state: SharedRoomState): Participant | null {
  return state.participants.find((person) => person.isHost) ?? null;
}

export function getCurrentRound(state: SharedRoomState): Round | null {
  return state.rounds.find((round) => round.id === state.currentRoundId) ?? null;
}
