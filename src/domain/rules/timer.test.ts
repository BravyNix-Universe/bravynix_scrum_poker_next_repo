import { describe, expect, it } from "vitest";

import {
  clampTimerDuration,
  getTimerRemainingMs,
  getTimerStatus,
  isValidTimerDuration,
  TIMER_MAX_MS,
  TIMER_MIN_MS,
  TIMER_PRESETS_MS,
} from "./timer";

describe("timer rules (PRD 12.5)", () => {
  it("accepts 30 seconds to 30 minutes, including every preset", () => {
    expect(isValidTimerDuration(TIMER_MIN_MS)).toBe(true);
    expect(isValidTimerDuration(TIMER_MAX_MS)).toBe(true);
    expect(TIMER_PRESETS_MS.every(isValidTimerDuration)).toBe(true);
    expect(isValidTimerDuration(29_000)).toBe(false);
    expect(isValidTimerDuration(TIMER_MAX_MS + 1_000)).toBe(false);
    expect(isValidTimerDuration(90_500)).toBe(false);
  });

  it("clamps custom durations into range", () => {
    expect(clampTimerDuration(0)).toBe(TIMER_MIN_MS);
    expect(clampTimerDuration(TIMER_MAX_MS * 2)).toBe(TIMER_MAX_MS);
  });

  it("reports time left between zero and the duration", () => {
    const timer = { durationMs: 8_000, endsAt: 10_000 };
    expect(getTimerRemainingMs(timer, 4_000)).toBe(6_000);
    expect(getTimerRemainingMs(timer, 12_000)).toBe(0);
    expect(getTimerRemainingMs(timer, 0)).toBe(8_000);
  });

  it("warns in the last minute and says when time is up", () => {
    const timer = { durationMs: 180_000, endsAt: 200_000 };
    expect(getTimerStatus(null, 0)).toBe("off");
    expect(getTimerStatus(timer, 20_000)).toBe("running");
    expect(getTimerStatus(timer, 140_000)).toBe("warning");
    expect(getTimerStatus(timer, 200_000)).toBe("expired");
    expect(getTimerStatus(timer, 260_000)).toBe("expired");
  });

  it("skips the one-minute warning for timers of a minute or less", () => {
    expect(getTimerStatus({ durationMs: 60_000, endsAt: 60_000 }, 1_000)).toBe("running");
    expect(getTimerStatus({ durationMs: 30_000, endsAt: 30_000 }, 20_000)).toBe("running");
  });
});
