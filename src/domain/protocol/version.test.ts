import { describe, expect, it } from "vitest";

import { isSupportedProtocol, PROTOCOL_VERSION } from "./version";

describe("protocol version (FR-052)", () => {
  it("accepts only this app's version", () => {
    expect(isSupportedProtocol(PROTOCOL_VERSION)).toBe(true);
    expect(isSupportedProtocol(PROTOCOL_VERSION + 1)).toBe(false);
    expect(isSupportedProtocol(String(PROTOCOL_VERSION))).toBe(false);
    expect(isSupportedProtocol(undefined)).toBe(false);
  });
});
