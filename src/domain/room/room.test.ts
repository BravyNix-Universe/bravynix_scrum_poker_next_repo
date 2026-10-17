import { describe, expect, it } from "vitest";

import {
  getRoomPhase,
  getStoryPosition,
  getVoteProgress,
  hasVoted,
  isExpectedVoter,
  type ParticipantId,
  type Round,
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
    storyId: "s1" as StoryId,
    number: 1,
    status: "voting",
    expectedVoterIds: [person("a"), person("b"), person("c")],
    votedIds: [],
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
