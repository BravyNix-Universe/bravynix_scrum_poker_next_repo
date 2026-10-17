import { describe, expect, it } from "vitest";

import { MESSAGE_LIMITS } from "./messages";
import { parseClientMessage, parseHostMessage } from "./parse-messages";

const json = (value: unknown) => JSON.stringify(value);
const TOKEN = "t".repeat(43);
const PROFILE = { displayName: "Ana", avatarId: null };

describe("parseClientMessage (SDD 12, rule 2)", () => {
  it("reads each message a participant may send, keeping only its fields", () => {
    expect(
      parseClientMessage(
        json({
          type: "join",
          id: "a.1",
          participantId: "p1",
          token: TOKEN,
          profile: PROFILE,
          isHost: true,
        }),
      ),
    ).toEqual({ type: "join", id: "a.1", participantId: "p1", token: TOKEN, profile: PROFILE });
    expect(
      parseClientMessage(json({ type: "vote", id: "a.2", roundId: "r1", seal: "c2VhbA" })),
    ).toEqual({ type: "vote", id: "a.2", roundId: "r1", seal: "c2VhbA" });
    expect(
      parseClientMessage(
        json({ type: "open", id: "a.3", roundId: "r1", card: "5", salt: "s".repeat(22) }),
      ),
    ).toMatchObject({ type: "open", card: "5" });
    expect(parseClientMessage(json({ type: "ping" }))).toEqual({ type: "ping" });
  });

  it("drops host actions, unknown types and anything malformed", () => {
    for (const message of [
      json({ type: "reveal" }),
      json({ type: "add-story", title: "Injected" }),
      json({ type: "vote", id: "a.1", roundId: "r1", seal: "not base64!" }),
      json({ type: "join", id: "a.1", participantId: "p1", token: "short", profile: PROFILE }),
      json({ type: "profile", id: "a.1", profile: { displayName: 5, avatarId: null } }),
      json({ type: "hello", protocol: "1", nonce: "n".repeat(22) }),
      json([{ type: "ping" }]),
      "{not json",
    ]) {
      expect(parseClientMessage(message)).toBeNull();
    }
  });

  it("limits size: 16 KB, except a restoring host's copy of the room", () => {
    const long = "x".repeat(MESSAGE_LIMITS.maxLength);
    expect(
      parseClientMessage(
        json({ type: "profile", id: "a.1", profile: { displayName: long, avatarId: null } }),
      ),
    ).toBeNull();

    const snapshot = {
      version: 3,
      state: { roomId: "k7Qx9mP2vT4w", note: long },
      signature: "c2ln",
    };
    expect(parseClientMessage(json({ type: "offer", snapshot }))).toMatchObject({ type: "offer" });
  });
});

describe("parseHostMessage", () => {
  it("reads the host's messages and drops malformed ones", () => {
    expect(parseHostMessage(json({ type: "ack", id: "a.1" }))).toEqual({ type: "ack", id: "a.1" });
    expect(
      parseHostMessage(
        json({ type: "patch", version: 4, patch: { fields: {}, rounds: [] }, signature: "c2ln" }),
      ),
    ).toMatchObject({ type: "patch", version: 4 });
    expect(
      parseHostMessage(json({ type: "patch", version: -1, patch: {}, signature: "c2ln" })),
    ).toBeNull();
    expect(parseHostMessage(json({ type: "welcome", protocol: 1 }))).toBeNull();
  });
});
