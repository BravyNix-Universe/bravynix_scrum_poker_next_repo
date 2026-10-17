import { describe, expect, it } from "vitest";

import { bytesToBigInt, fromBase64Url, toBase62, toBase64Url } from "./encoding";

describe("toBase62", () => {
  it("pads to the requested length", () => {
    expect(toBase62(0n, 4)).toBe("0000");
    expect(toBase62(61n, 2)).toBe("0z");
    expect(toBase62(62n, 2)).toBe("10");
  });

  it("keeps only the lowest digits when the value is larger than the length allows", () => {
    expect(toBase62(62n ** 3n + 5n, 3)).toBe("005");
  });
});

describe("bytesToBigInt", () => {
  it("reads bytes big-endian", () => {
    expect(bytesToBigInt(new Uint8Array([0x01, 0x00]))).toBe(256n);
  });
});

describe("base64url", () => {
  it("round-trips arbitrary bytes without padding or unsafe characters", () => {
    const bytes = new Uint8Array(Array.from({ length: 96 }, (_, i) => (i * 37) % 256));
    const encoded = toBase64Url(bytes);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(encoded).toHaveLength(128);
    expect(fromBase64Url(encoded)).toEqual(bytes);
  });

  it("rejects characters outside the alphabet", () => {
    expect(() => fromBase64Url("abc+")).toThrow(SyntaxError);
  });
});
