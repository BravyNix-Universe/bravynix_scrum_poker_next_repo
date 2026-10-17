import { describe, expect, it } from "vitest";

import { canonicalJson } from "./canonical-json";

describe("canonicalJson", () => {
  it("gives the same text whatever order keys were added in", () => {
    expect(canonicalJson({ b: 1, a: { d: [2, { z: 1, y: 2 }], c: null } })).toBe(
      canonicalJson({ a: { c: null, d: [2, { y: 2, z: 1 }] }, b: 1 }),
    );
    expect(canonicalJson({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it("leaves out undefined properties, as a JSON round trip would", () => {
    const value = { a: 1, b: undefined };
    expect(canonicalJson(value)).toBe(canonicalJson(JSON.parse(JSON.stringify(value))));
  });
});
