const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/** Below this, the time left is highlighted as a warning (matches the design's amber state). */
export const EXPIRING_SOON_MS = 4 * HOUR;

/** "Deletes in 18 h", "Deletes in 45 min" or "Deletes in under a minute", for lists. */
export function formatTimeLeft(expiresAt: number, now: number): string {
  const remaining = expiresAt - now;
  if (remaining < MINUTE) return "Deletes in under a minute";
  if (remaining < HOUR) return `Deletes in ${Math.floor(remaining / MINUTE)} min`;
  return `Deletes in ${Math.floor(remaining / HOUR)} h`;
}

/** "23 h 48 min", "45 min" or "under a minute", for a room's own countdown. */
export function formatDuration(remainingMs: number): string {
  if (remainingMs < MINUTE) return "under a minute";
  const hours = Math.floor(remainingMs / HOUR);
  const minutes = Math.floor((remainingMs % HOUR) / MINUTE);
  if (hours === 0) return `${minutes} min`;
  return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

export function isExpiringSoon(expiresAt: number, now: number): boolean {
  return expiresAt - now < EXPIRING_SOON_MS;
}
