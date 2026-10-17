import { describe, expect, it } from "vitest";

import { formatDeletionTime, formatTimerClock, formatTimerDuration } from "./clock";

describe("formatTimerClock", () => {
  it("shows minutes and seconds, rounding up", () => {
    expect(formatTimerClock(120_000)).toBe("02:00");
    expect(formatTimerClock(90_001)).toBe("01:31");
    expect(formatTimerClock(400)).toBe("00:01");
    expect(formatTimerClock(-5)).toBe("00:00");
    expect(formatTimerClock(30 * 60_000)).toBe("30:00");
  });
});

describe("formatTimerDuration", () => {
  it("names presets and custom durations", () => {
    expect(formatTimerDuration(60_000)).toBe("1 min");
    expect(formatTimerDuration(90_000)).toBe("1 min 30 s");
    expect(formatTimerDuration(30_000)).toBe("30 s");
  });
});

describe("formatDeletionTime", () => {
  const options = { locale: "en-GB", timeZone: "Asia/Kolkata" };
  // 17 Oct 2026, 10:00 in India.
  const now = Date.UTC(2026, 9, 17, 4, 30);

  it("says today or tomorrow, in the given time zone", () => {
    expect(formatDeletionTime(now + 3 * 3_600_000, now, options)).toBe("today at 13:00");
    expect(formatDeletionTime(now + 20 * 3_600_000, now, options)).toBe("tomorrow at 6:00");
  });
});
