import { describe, expect, it } from "vitest";

import type { ParticipantId, RoundOutcome, Voter } from "./room";
import { getRoundResults } from "./round-results";

const voter = (id: string): Voter => ({
  participantId: id as ParticipantId,
  displayName: id,
  avatarId: null,
});

describe("getRoundResults", () => {
  it("summarises the PRD example: 4.6 from five numeric votes and one ? (PRD 11.2)", () => {
    const outcome: RoundOutcome = {
      votes: (["2", "3", "5", "5", "8", "unsure"] as const).map((card, index) => ({
        ...voter(`p${index}`),
        card,
      })),
      notVoted: [voter("late")],
      notRevealed: [voter("offline")],
    };

    const results = getRoundResults(outcome);

    expect(results.displayAverage).toBe("4.6");
    expect(results.numericCount).toBe(5);
    expect(results.unsureCount).toBe(1);
    expect(results.notVotedCount).toBe(1);
    expect(results.notRevealedCount).toBe(1);
    expect(results.mostCommon).toEqual({ cards: ["5"], count: 2 });
    expect(results.spread).toEqual({ low: "2", high: "8" });
  });

  it("has no numeric estimate when every vote is ? (PRD 18.4.3)", () => {
    const results = getRoundResults({
      votes: [{ ...voter("a"), card: "unsure" }],
      notVoted: [],
      notRevealed: [],
    });
    expect(results.displayAverage).toBeNull();
    expect(results.spread).toBeNull();
  });
});
