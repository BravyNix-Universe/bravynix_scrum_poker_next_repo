import { describe, expect, it } from "vitest";

import { displayNameOf, validateDisplayName } from "./profile";

describe("display names", () => {
  it("treats a blank name as Anonymous (PRD FR-005)", () => {
    expect(validateDisplayName("   ")).toEqual({ ok: true, value: null });
    expect(displayNameOf({ displayName: null })).toBe("Anonymous");
  });

  it("accepts up to 32 characters in any language, trimmed (PRD D-06)", () => {
    expect(validateDisplayName("  Priya ")).toEqual({ ok: true, value: "Priya" });
    expect(validateDisplayName("प्रिया")).toEqual({ ok: true, value: "प्रिया" });
    expect(validateDisplayName("a".repeat(32))).toEqual({ ok: true, value: "a".repeat(32) });
    expect(validateDisplayName("a".repeat(33))).toEqual({ ok: false, error: "too-long" });
  });
});
