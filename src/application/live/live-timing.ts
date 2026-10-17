import { REVEAL_DEADLINE_MS } from "@/domain/rules/lifecycle";

/** Timings of a live room (SDD 12 rule 8, SDD 15). Tests pass shorter ones. */
export interface LiveTiming {
  /** How often each side of a link tells the other it is still there. */
  heartbeatMs: number;
  /** A link that has been silent this long is treated as lost. */
  silenceLimitMs: number;
  /** How long a participant waits for the host's answer to its hello. */
  welcomeTimeoutMs: number;
  /**
   * After a refresh the old page may hold the room's address for a moment, so a taken address
   * is retried this many times before the room counts as open elsewhere (FR-046).
   */
  hubRetries: number;
  hubRetryDelayMs: number;
  /** After the host reveals, voters have this long to open their votes (FR-043). */
  revealDeadlineMs: number;
  /** The wait before reconnect attempt `attempt` (0-based). */
  reconnectDelayMs: (attempt: number) => number;
}

/** Reconnects back off from 1 second to 30 seconds (SDD 12, rule 8). */
const RECONNECT_STEPS_MS = [1_000, 2_000, 4_000, 8_000, 16_000, 30_000] as const;

export function reconnectDelayMs(attempt: number): number {
  return RECONNECT_STEPS_MS[Math.min(Math.max(attempt, 0), RECONNECT_STEPS_MS.length - 1)]!;
}

export const LIVE_TIMING: LiveTiming = {
  heartbeatMs: 5_000,
  silenceLimitMs: 20_000,
  welcomeTimeoutMs: 15_000,
  hubRetries: 3,
  hubRetryDelayMs: 2_000,
  revealDeadlineMs: REVEAL_DEADLINE_MS,
  reconnectDelayMs,
};
