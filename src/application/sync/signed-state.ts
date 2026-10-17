import { PROTOCOL_VERSION } from "@/domain/protocol/version";
import type { RoomId } from "@/domain/room/room-identity";
import { canonicalJson } from "@/domain/shared/canonical-json";

import type { SharedRoomState } from "../referee/room-state";

/**
 * One version of the shared room state with the host's signature over it (SDD 10, 12). Every
 * participant keeps the latest one, so a host on a new device can restore the room from them
 * (SDD 11.6).
 */
export interface SignedState {
  /** Raised by one with every change the host publishes. */
  version: number;
  state: SharedRoomState;
  signature: string;
}

/** The exact text the host signs for a state version. */
export function statePayload(version: number, state: SharedRoomState): string {
  return canonicalJson({ purpose: "state", protocol: PROTOCOL_VERSION, version, state });
}

/** The text the host signs to answer a participant's challenge, proving it holds the room key. */
export function challengePayload(roomId: RoomId, nonce: string): string {
  return canonicalJson({ purpose: "challenge", protocol: PROTOCOL_VERSION, roomId, nonce });
}
