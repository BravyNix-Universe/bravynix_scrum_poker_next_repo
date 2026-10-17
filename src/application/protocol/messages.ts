import type { Profile } from "@/domain/room/profile";
import type { ParticipantId, RoundId } from "@/domain/room/room";
import type { CardId } from "@/domain/rules/deck";

import type { Refusal } from "../referee/room-command";
import type { SignedState } from "../sync/signed-state";
import type { StatePatch } from "../sync/state-patch";

/**
 * Messages between a participant's browser and the host's (SDD 12). Host actions never
 * travel: they start inside the host's browser, so a participant can send only these.
 */
export type ClientMessage =
  /** Opens the handshake. `nonce` is a challenge the host must sign with the room key. */
  | { type: "hello"; protocol: number; nonce: string }
  /** A participant's signed copy, offered to a host that is restoring the room (SDD 11.6). */
  | { type: "offer"; snapshot: SignedState }
  | {
      type: "join";
      id: string;
      participantId: ParticipantId;
      /** The secret that proves a returning participant is the same one (FR-006). */
      token: string;
      profile: Profile;
    }
  | { type: "profile"; id: string; profile: Profile }
  /** A sealed vote: the fingerprint of a card and a secret salt (SDD 11.4). */
  | { type: "vote"; id: string; roundId: RoundId; seal: string }
  /** The card and salt behind a seal, sent once the round is revealing. */
  | { type: "open"; id: string; roundId: RoundId; card: CardId; salt: string }
  /** Asks for the full state after a gap or a bad signature. */
  | { type: "resync" }
  | { type: "ping" };

/** A participant message the host answers with `ack` or `reject`. `id` makes repeats harmless. */
export type ClientRequest = Extract<ClientMessage, { id: string }>;

export type HostMessage =
  | {
      type: "welcome";
      protocol: number;
      /** The room's public key, which hashes to the room ID. */
      publicKey: string;
      /** The host's signature over the participant's nonce. */
      proof: string;
      /** Null while the host is restoring the room and has no state yet. */
      snapshot: SignedState | null;
      /** The host's clock, so countdowns don't depend on each device's clock. */
      now: number;
    }
  | { type: "incompatible"; protocol: number }
  /** One published change. The signature covers the whole state after the change. */
  | { type: "patch"; version: number; patch: StatePatch; signature: string }
  | { type: "snapshot"; snapshot: SignedState }
  | { type: "ack"; id: string }
  | { type: "reject"; id: string; refusal: Refusal }
  | { type: "ping"; now: number };

/**
 * Size limits (SDD 12, rule 2). Everything a participant sends is small, except the copy it
 * offers a restoring host, which holds the whole room.
 */
export const MESSAGE_LIMITS = {
  maxLength: 16 * 1024,
  maxOfferLength: 4 * 1024 * 1024,
} as const;

export function encodeMessage(message: ClientMessage | HostMessage): string {
  return JSON.stringify(message);
}
