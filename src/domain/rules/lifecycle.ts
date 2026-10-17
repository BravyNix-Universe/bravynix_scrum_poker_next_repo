import { LIMITS } from "./limits";

/** A room's deletion time: fixed at creation + 24 hours and never extended (PRD FR-023). */
export function roomExpiresAt(createdAt: number): number {
  return createdAt + LIMITS.roomLifetimeMs;
}

export function isExpired(expiresAt: number, now: number): boolean {
  return expiresAt <= now;
}
