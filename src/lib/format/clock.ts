/** "02:31": minutes and seconds left on the round timer, rounded up so it ends at 00:00. */
export function formatTimerClock(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/** "2 min" or "1 min 30 s", for timer presets and the custom duration. */
export function formatTimerDuration(durationMs: number): string {
  const totalSeconds = Math.round(durationMs / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds} s`;
  return seconds === 0 ? `${minutes} min` : `${minutes} min ${seconds} s`;
}

export interface ClockOptions {
  locale?: string;
  timeZone?: string;
}

/**
 * "today at 5:42 pm" or "tomorrow at 9:15 am": when a room is deleted. Rooms live 24 hours,
 * so the deadline is always today or tomorrow (PRD FR-023).
 */
export function formatDeletionTime(
  expiresAt: number,
  now: number,
  { locale, timeZone }: ClockOptions = {},
): string {
  const day = new Intl.DateTimeFormat(locale, {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  const time = new Intl.DateTimeFormat(locale, { timeZone, hour: "numeric", minute: "2-digit" });
  const when = day.format(expiresAt) === day.format(now) ? "today" : "tomorrow";
  return `${when} at ${time.format(expiresAt)}`;
}
