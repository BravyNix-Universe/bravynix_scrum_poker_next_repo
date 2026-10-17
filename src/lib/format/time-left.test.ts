import { describe, expect, it } from "vitest";

import { formatDuration, formatTimeLeft, isExpiringSoon } from "./time-left";

const NOW = Date.UTC(2026, 9, 17, 12, 0, 0);
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

describe("formatTimeLeft", () => {
  it.each([
    { left: 24 * HOUR, expected: "Deletes in 24 h" },
    { left: 18 * HOUR + 59 * MINUTE, expected: "Deletes in 18 h" },
    { left: HOUR, expected: "Deletes in 1 h" },
    { left: 59 * MINUTE + 30_000, expected: "Deletes in 59 min" },
    { left: 30_000, expected: "Deletes in under a minute" },
  ])("$left ms left reads '$expected'", ({ left, expected }) => {
    expect(formatTimeLeft(NOW + left, NOW)).toBe(expected);
  });
});

describe("formatDuration", () => {
  it.each([
    { left: 23 * HOUR + 48 * MINUTE + 59_000, expected: "23 h 48 min" },
    { left: 2 * HOUR, expected: "2 h" },
    { left: 45 * MINUTE, expected: "45 min" },
    { left: 59_000, expected: "under a minute" },
  ])("$left ms reads '$expected'", ({ left, expected }) => {
    expect(formatDuration(left)).toBe(expected);
  });
});

describe("isExpiringSoon", () => {
  it("flags rooms with less than four hours left", () => {
    expect(isExpiringSoon(NOW + 3 * HOUR, NOW)).toBe(true);
    expect(isExpiringSoon(NOW + 5 * HOUR, NOW)).toBe(false);
  });
});
