import { describe, expect, it } from "vitest";

import {
  canDeleteStory,
  getNextStory,
  getRoomPhase,
  getStoryPosition,
  getVoteProgress,
  getWaitingVoterIds,
  hasVoted,
  isExpectedVoter,
  latestRevealedRound,
  type ParticipantId,
  type Round,
  type RoundId,
  type Story,
  type StoryId,
} from "./room";

const story = (id: string, status: Story["status"] = "queued"): Story => ({
  id: id as StoryId,
  title: `Story ${id}`,
  status,
});
const person = (id: string) => id as ParticipantId;

function round(overrides: Partial<Round> = {}): Round {
  return {
    id: "r1" as RoundId,
    storyId: "s1" as StoryId,
    number: 1,
    status: "voting",
    startedAt: 0,
    expectedVoterIds: [person("a"), person("b"), person("c")],
    votedIds: [],
    revealedAt: null,
    outcome: null,
    ...overrides,
  };
}

describe("room phase (PRD 8.3)", () => {
  it("is Discuss for an active story with no open round", () => {
    expect(getRoomPhase(null, null)).toBe("no-story");
    expect(getRoomPhase(story("s1", "active"), null)).toBe("discuss");
    expect(getRoomPhase(story("s1", "active"), round({ status: "cancelled" }))).toBe("discuss");
  });

  it("is Estimate while voting or revealing, and Review once revealed", () => {
    expect(getRoomPhase(story("s1", "active"), round())).toBe("estimate");
    expect(getRoomPhase(story("s1", "active"), round({ status: "revealing" }))).toBe("estimate");
    expect(getRoomPhase(story("s1", "active"), round({ status: "revealed" }))).toBe("review");
  });
});

describe("story position", () => {
  it("counts only stories that aren't removed", () => {
    const stories = [story("s1"), story("s2", "removed"), story("s3", "active")];
    expect(getStoryPosition(stories, "s3" as StoryId)).toEqual({ number: 2, total: 2 });
    expect(getStoryPosition(stories, "s2" as StoryId)).toBeNull();
  });
});

describe("vote progress (PRD 12.4)", () => {
  it("counts expected voters, adding the host only once they vote", () => {
    expect(getVoteProgress(round({ votedIds: [person("a")] }))).toEqual({
      voted: 1,
      expected: 3,
      waitingOn: 2,
    });
    expect(getVoteProgress(round({ votedIds: [person("a"), person("host")] }))).toEqual({
      voted: 2,
      expected: 4,
      waitingOn: 2,
    });
  });

  it("knows who has voted", () => {
    expect(hasVoted(round({ votedIds: [person("a")] }), person("a"))).toBe(true);
    expect(hasVoted(round(), person("a"))).toBe(false);
    expect(hasVoted(null, person("a"))).toBe(false);
  });

  it("waits on the host only once they vote", () => {
    expect(isExpectedVoter(round(), person("a"))).toBe(true);
    expect(isExpectedVoter(round(), person("host"))).toBe(false);
    expect(isExpectedVoter(round({ votedIds: [person("host")] }), person("host"))).toBe(true);
    expect(isExpectedVoter(null, person("a"))).toBe(false);
  });
});

describe("story queue (PRD 12.2)", () => {
  const queue = [
    story("s1", "estimated"),
    story("s2", "active"),
    story("s3", "estimated"),
    story("s4", "removed"),
    story("s5", "queued"),
  ];

  it("moves on to the next story that still needs an estimate", () => {
    expect(getNextStory(queue, "s2" as StoryId)?.id).toBe("s5");
    expect(getNextStory(queue, "s5" as StoryId)).toBeNull();
  });

  it("falls back to the next visible story when all are estimated", () => {
    expect(getNextStory(queue.slice(0, 3), "s1" as StoryId)?.id).toBe("s2");
  });

  it("finds a story's latest revealed round", () => {
    const rounds = [
      round({ id: "r1" as RoundId, number: 1, status: "revealed" }),
      round({ id: "r2" as RoundId, number: 2, status: "revealed" }),
      round({ id: "r3" as RoundId, number: 3, status: "cancelled" }),
    ];
    expect(latestRevealedRound(rounds, "s1" as StoryId)?.number).toBe(2);
    expect(latestRevealedRound(rounds, "s2" as StoryId)).toBeNull();
  });

  it("allows deleting only stories without rounds (FR-032, FR-039)", () => {
    const rounds = [round({ status: "cancelled" })];
    expect(canDeleteStory(rounds, "s1" as StoryId)).toBe(false);
    expect(canDeleteStory(rounds, "s2" as StoryId)).toBe(true);
  });
});

describe("waiting voters (PRD A-01)", () => {
  it("lists expected voters without a vote", () => {
    expect(getWaitingVoterIds(round({ votedIds: [person("b"), person("host")] }))).toEqual([
      person("a"),
      person("c"),
    ]);
  });
});
