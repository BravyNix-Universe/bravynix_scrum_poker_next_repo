import type { RoomLobby, RoomView } from "./room-view";
import type { Refusal } from "../referee/room-command";

/**
 * How this device is connected once it has joined (PRD 8.5). While reconnecting, its votes
 * can't reach the host (FR-057); while the host is away, voting pauses for everyone (FR-047).
 */
export type ConnectionStatus = "connected" | "reconnecting" | "host-away";

/** Why this device can't be in the room right now (PRD 8.5, 16). Each has its own screen. */
export type SessionProblem =
  | "service-unreachable"
  | "host-unreachable"
  | "host-unverified"
  | "room-full"
  | "open-elsewhere"
  | "outdated-app"
  /** The browser can't make peer-to-peer connections at all. */
  | "unsupported-browser";

/** A command of this device's that the room refused (PRD 8.7). `id` tells repeats apart. */
export interface RoomNotice {
  id: number;
  refusal: Refusal;
}

export type RoomSessionState =
  | { status: "connecting" }
  /** A participant arrived before the host opened the room; retries on its own (PRD 9.2). */
  | { status: "waiting-for-host" }
  /**
   * The host opened the host link on a device that doesn't have the room yet. It is rebuilt
   * from the signed copy of the first participant who connects (SDD 11.6).
   */
  | { status: "restoring" }
  | { status: "lobby"; lobby: RoomLobby }
  | {
      status: "joined";
      view: RoomView;
      connection: ConnectionStatus;
      notice: RoomNotice | null;
    }
  | { status: "failed"; problem: SessionProblem }
  /** Neutral wording: never says whether the room existed (FR-034). */
  | { status: "unavailable" };
