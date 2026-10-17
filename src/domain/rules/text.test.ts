import { describe, expect, it } from "vitest";

import { LIMITS } from "./limits";
import { countCharacters, validateTitle } from "./text";

describe("countCharacters", () => {
  it("counts grapheme clusters, not UTF-16 code units", () => {
    expect(countCharacters("abc")).toBe(3);
    expect(countCharacters("👩🏽‍💻")).toBe(1);
    expect(countCharacters("e\u0301")).toBe(1);
  });
});

describe("validateTitle", () => {
  it("accepts a title and trims surrounding whitespace", () => {
    expect(validateTitle("  Checkout revamp  ")).toEqual({
      ok: true,
      value: "Checkout revamp",
    });
  });

  it("refuses an empty or whitespace-only title", () => {
    expect(validateTitle("")).toEqual({ ok: false, error: "empty" });
    expect(validateTitle("   \t ")).toEqual({ ok: false, error: "empty" });
  });

  it("accepts exactly 160 characters and refuses 161 (PRD 18.1.2)", () => {
    expect(validateTitle("a".repeat(LIMITS.titleMaxLength)).ok).toBe(true);
    expect(validateTitle("a".repeat(LIMITS.titleMaxLength + 1))).toEqual({
      ok: false,
      error: "too-long",
    });
  });

  it("accepts any language's characters", () => {
    expect(validateTitle("चेकआउट सुधार")).toEqual({
      ok: true,
      value: "चेकआउट सुधार",
    });
  });
});
