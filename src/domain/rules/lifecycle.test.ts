import { describe, expect, it } from "vitest";

import { isExpired, roomExpiresAt } from "./lifecycle";

const CREATED_AT = Date.UTC(2026, 9, 17, 9, 30, 0);
const HOUR = 60 * 60 * 1000;

describe("room lifecycle", () => {
  it("deletes a room exactly 24 hours after creation (PRD FR-023)", () => {
    expect(roomExpiresAt(CREATED_AT)).toBe(CREATED_AT + 24 * HOUR);
  });

  it("treats a room as expired from its deadline onwards", () => {
    const expiresAt = roomExpiresAt(CREATED_AT);
    expect(isExpired(expiresAt, expiresAt - 1)).toBe(false);
    expect(isExpired(expiresAt, expiresAt)).toBe(true);
  });
});
