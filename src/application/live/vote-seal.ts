import { PROTOCOL_VERSION } from "@/domain/protocol/version";
import type { ParticipantId, RoundId } from "@/domain/room/room";
import type { RoomId } from "@/domain/room/room-identity";
import type { CardId } from "@/domain/rules/deck";
import { canonicalJson } from "@/domain/shared/canonical-json";

import type { RoomCrypto } from "../ports/room-crypto";

export interface SealInput {
  roomId: RoomId;
  roundId: RoundId;
  participantId: ParticipantId;
  card: CardId;
  /** 16 random bytes, kept on the voter's device until reveal. */
  salt: string;
}

/**
 * A vote's seal: the SHA-256 fingerprint of the card with its room, round, voter and salt
 * (SDD 11.4, ADR-05). The salt makes it impossible to recover the card by trying all of them;
 * binding the round and voter stops a seal being replayed anywhere else.
 */
export function sealVote(crypto: Pick<RoomCrypto, "digest">, input: SealInput): Promise<string> {
  return crypto.digest(canonicalJson({ purpose: "vote", protocol: PROTOCOL_VERSION, ...input }));
}

/** Random bytes in each salt (SDD 13.2). */
export const SALT_BYTES = 16;
