import { describe, expect, it } from "vitest";

import type { RoundId, StoryId } from "@/domain/room/room";

import { type AnnouncedRoom, describeRoomChange } from "./announcements";

const BASE: AnnouncedRoom = {
  connection: "connected",
  ended: false,
  storyId: "s1" as StoryId,
  storyTitle: "Saved cards",
  roundId: "r1" as RoundId,
  roundNumber: 1,
  roundStatus: "voting",
  result: null,
  myVote: null,
};

const change = (after: Partial<AnnouncedRoom>, before: Partial<AnnouncedRoom> = {}) =>
  describeRoomChange({ ...BASE, ...before }, { ...BASE, ...before, ...after });

describe("describeRoomChange (PRD 8.6)", () => {
  it("says nothing when nothing worth hearing changed", () => {
    expect(change({})).toBeNull();
  });

  it("announces connection loss and recovery", () => {
    expect(change({ connection: "reconnecting" })).toBe(
      "Connection lost. Reconnecting. Your vote isn't recorded yet.",
    );
    expect(change({ connection: "connected" }, { connection: "reconnecting" })).toBe(
      "Reconnected.",
    );
    expect(change({ connection: "host-away" })).toBe("The host is away. Voting is paused.");
    expect(change({ connection: "connected" }, { connection: "host-away" })).toBe(
      "The host is back. Voting has resumed.",
    );
  });

  it("announces a new story and a new round", () => {
    expect(
      change(
        {
          storyId: "s2" as StoryId,
          storyTitle: "Guest checkout",
          roundId: null,
          roundStatus: null,
        },
        { roundStatus: "revealed" },
      ),
    ).toBe("Now on story: Guest checkout.");
    expect(
      change(
        { roundId: "r2" as RoundId, roundNumber: 2, roundStatus: "voting" },
        { roundStatus: "revealed" },
      ),
    ).toBe("Estimation started, round 2. Pick a card.");
  });

  it("announces reveal and the result", () => {
    expect(change({ roundStatus: "revealing" })).toBe("Voting has closed. Revealing votes.");
    expect(
      change(
        { roundStatus: "revealed", result: "Average 5.5 from 2 numeric votes." },
        { roundStatus: "revealing" },
      ),
    ).toBe("Votes revealed. Average 5.5 from 2 numeric votes.");
  });

  it("confirms this device's vote, and an ended room above everything else", () => {
    expect(change({ myVote: "5" })).toBe("Your vote is recorded.");
    expect(change({ ended: true, roundStatus: "cancelled" })).toBe(
      "The host ended the room. It's read-only now.",
    );
  });
});
