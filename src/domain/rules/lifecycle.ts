import { LIMITS } from "./limits";

/**
 * After the host reveals, voters have this long to open their sealed votes; any vote still
 * closed then shows as "not revealed" (PRD 9.3, FR-043, D-02).
 */
export const REVEAL_DEADLINE_MS = 5_000;

/** A room's deletion time: fixed at creation + 24 hours and never extended (PRD FR-023). */
export function roomExpiresAt(createdAt: number): number {
  return createdAt + LIMITS.roomLifetimeMs;
}

export function isExpired(expiresAt: number, now: number): boolean {
  return expiresAt <= now;
}
