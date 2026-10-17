import type { RoomSession } from "./room-session";
import type { SessionProblem } from "../room/room-session-state";

/**
 * Situations the preview session can act out on request, so every connection state can be
 * reviewed without a network. Live sessions don't implement this. `rate-limited` refuses this
 * device's next change, as the host does when a device sends too much (PRD 14.3).
 */
export type SimulatedScenario =
  | "connection-drop"
  | "host-away"
  | "host-back"
  | "waiting-for-host"
  | "crowd"
  | "rate-limited"
  | SessionProblem;

export interface RoomSessionSimulation {
  simulate(scenario: SimulatedScenario): void;
}

export function canSimulate(session: RoomSession): session is RoomSession & RoomSessionSimulation {
  return "simulate" in session && typeof session.simulate === "function";
}
