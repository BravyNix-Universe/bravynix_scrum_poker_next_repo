import { describe, expect, it } from "vitest";

import { isEncodedHostKey, isRoomId, roomIdFromDigest } from "./room-identity";

describe("room identity", () => {
  it("reduces a digest to a 12-character base62 room ID", () => {
    expect(roomIdFromDigest(new Uint8Array(32))).toBe("000000000000");
    expect(roomIdFromDigest(Uint8Array.of(1))).toBe("000000000001");
    expect(roomIdFromDigest(new Uint8Array(32).fill(255))).toMatch(/^[0-9A-Za-z]{12}$/);
  });

  it("gives different digests different room IDs", () => {
    const first = roomIdFromDigest(new Uint8Array(32).fill(7));
    const second = roomIdFromDigest(new Uint8Array(32).fill(8));
    expect(first).not.toBe(second);
  });

  it("accepts only well-formed room IDs and host keys", () => {
    expect(isRoomId("k7Qx9mP2vT4w")).toBe(true);
    expect(isRoomId("short")).toBe(false);
    expect(isRoomId("k7Qx9mP2vT4w!")).toBe(false);
    expect(isEncodedHostKey("A".repeat(128))).toBe(true);
    expect(isEncodedHostKey("abc")).toBe(false);
    expect(isEncodedHostKey("A".repeat(127).concat("="))).toBe(false);
  });
});
