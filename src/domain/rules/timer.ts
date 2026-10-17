/** Round timer rules (PRD 12.5, D-07). The timer is off by default and never reveals. */
export const TIMER_PRESETS_MS = [60_000, 120_000, 180_000, 300_000] as const;
export const TIMER_MIN_MS = 30_000;
export const TIMER_MAX_MS = 30 * 60_000;
/** Custom durations move in half-minute steps. */
export const TIMER_STEP_MS = 30_000;
/** Remaining time at which the room hears a "1 minute left" warning. */
export const TIMER_WARNING_MS = 60_000;

export function isValidTimerDuration(durationMs: number): boolean {
  return (
    Number.isInteger(durationMs) &&
    durationMs >= TIMER_MIN_MS &&
    durationMs <= TIMER_MAX_MS &&
    durationMs % 1_000 === 0
  );
}

export function clampTimerDuration(durationMs: number): number {
  return Math.min(TIMER_MAX_MS, Math.max(TIMER_MIN_MS, durationMs));
}

/** A running countdown: how long it was set for and when it reaches zero. */
export interface Countdown {
  durationMs: number;
  endsAt: number;
}

/**
 * Milliseconds left: never below zero, and never above the duration, so a clock that runs
 * behind can't show more time than the host set.
 */
export function getTimerRemainingMs(timer: Countdown, now: number): number {
  return Math.min(timer.durationMs, Math.max(0, timer.endsAt - now));
}

/** off; running; in its last minute (timers longer than a minute only); or at zero. */
export type TimerStatus = "off" | "running" | "warning" | "expired";

export function getTimerStatus(timer: Countdown | null, now: number): TimerStatus {
  if (!timer) return "off";
  const remaining = getTimerRemainingMs(timer, now);
  if (remaining === 0) return "expired";
  if (remaining <= TIMER_WARNING_MS && timer.durationMs > TIMER_WARNING_MS) return "warning";
  return "running";
}
