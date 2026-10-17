import { describe, expect, it } from "vitest";

import type { EncodedHostKey, RoomId } from "@/domain/room/room-identity";

import {
  buildHostLink,
  buildParticipantLink,
  formatLinkForDisplay,
  maskHostLink,
  parseRoomFragment,
} from "./room-links";

const ROOM_ID = "k7Qx9mP2vT4w" as RoomId;
const HOST_KEY = "A".repeat(126).concat("9f") as EncodedHostKey;
const ORIGIN = "https://poker.bravynix.com";

describe("room links", () => {
  it("builds a participant link that never contains the host key (PRD 18.1.7)", () => {
    const link = buildParticipantLink(`${ORIGIN}/`, ROOM_ID);
    expect(link).toBe("https://poker.bravynix.com/r/#k7Qx9mP2vT4w");
    expect(link).not.toContain(HOST_KEY);
  });

  it("puts the host key after # in the host link", () => {
    const link = buildHostLink(ORIGIN, ROOM_ID, HOST_KEY);
    const url = new URL(link);
    expect(url.pathname).toBe("/r/");
    expect(url.search).toBe("");
    expect(url.hash).toBe(`#${ROOM_ID}&h=${HOST_KEY}`);
  });

  it("parses participant and host fragments", () => {
    expect(parseRoomFragment(`#${ROOM_ID}`)).toEqual({
      roomId: ROOM_ID,
      hostKey: null,
    });
    expect(parseRoomFragment(`#${ROOM_ID}&h=${HOST_KEY}`)).toEqual({
      roomId: ROOM_ID,
      hostKey: HOST_KEY,
    });
  });

  it("rejects malformed fragments", () => {
    expect(parseRoomFragment("")).toBeNull();
    expect(parseRoomFragment("#not-a-room")).toBeNull();
    expect(parseRoomFragment(`#${ROOM_ID}&h=too-short`)).toBeNull();
  });

  it("masks the host key for display", () => {
    const masked = maskHostLink(buildHostLink(ORIGIN, ROOM_ID, HOST_KEY));
    expect(masked).toBe(`${ORIGIN}/r/#${ROOM_ID}&h=••••AA9f`);
    expect(masked).not.toContain(HOST_KEY);
  });

  it("drops the protocol for display", () => {
    expect(formatLinkForDisplay(buildParticipantLink(ORIGIN, ROOM_ID))).toBe(
      `poker.bravynix.com/r/#${ROOM_ID}`,
    );
    expect(formatLinkForDisplay(`http://localhost:3000/r/#${ROOM_ID}`)).toBe(
      `localhost:3000/r/#${ROOM_ID}`,
    );
  });
});
