import type { ParticipantId, RoundId } from "@/domain/room/room";
import type { RoomId, EncodedHostKey } from "@/domain/room/room-identity";
import type { CardId } from "@/domain/rules/deck";

import type { RoomState } from "../referee/room-state";
import type { SignedState } from "../sync/signed-state";

/** The authoritative record of a room, on the device that hosts it (SDD 10). */
export interface HostRoomRecord {
  kind: "host";
  roomId: RoomId;
  /** The version of the shared state last published. */
  version: number;
  /** The referee's state, seals included. */
  state: RoomState;
  /** Fingerprints of each participant's token; the tokens stay with the participants. */
  tokenHashes: Readonly<Record<ParticipantId, string>>;
  expiresAt: number;
}

/** A participant's copy of a room: the latest state the host signed (SDD 10, 11.6). */
export interface ParticipantRoomRecord {
  kind: "participant";
  roomId: RoomId;
  /** The host's public key, already checked against the room ID. */
  hostPublicKey: string;
  snapshot: SignedState;
  expiresAt: number;
}

export type RoomRecord = HostRoomRecord | ParticipantRoomRecord;

/** Who this device is in a room: a random ID and the secret token that proves it (FR-006). */
export interface Membership {
  participantId: ParticipantId;
  token: string;
}

/** A card and salt kept only on the voter's device until reveal (SDD 11.4). */
export interface KeptVote {
  roundId: RoundId;
  card: CardId;
  salt: string;
  /**
   * The vote this one replaced, until the host confirms the change. If the change arrives
   * after voting closed, the host holds this one's seal instead.
   */
  replaced: { card: CardId; salt: string } | null;
}

/**
 * Room data on this device, deleted when each room expires (SDD 10, ADR-07). Everything is
 * keyed by room ID, and nothing here ever leaves the device except through the room itself.
 */
export interface RoomStore {
  getRoom(roomId: RoomId): Promise<RoomRecord | null>;
  saveRoom(record: RoomRecord): Promise<void>;
  getHostKey(roomId: RoomId): Promise<EncodedHostKey | null>;
  saveHostKey(roomId: RoomId, hostKey: EncodedHostKey, expiresAt: number): Promise<void>;
  getMembership(roomId: RoomId): Promise<Membership | null>;
  saveMembership(roomId: RoomId, membership: Membership, expiresAt: number): Promise<void>;
  getVote(roomId: RoomId): Promise<KeptVote | null>;
  saveVote(roomId: RoomId, vote: KeptVote, expiresAt: number): Promise<void>;
  deleteVote(roomId: RoomId): Promise<void>;
  /** Deletes everything this device holds for the room. */
  deleteRoom(roomId: RoomId): Promise<void>;
  /** Deletes every room whose deletion time has passed (PRD FR-023, SDD 11.5). */
  purgeExpired(now: number): Promise<void>;
}
