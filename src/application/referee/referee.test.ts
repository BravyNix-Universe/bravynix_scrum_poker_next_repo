import { describe, expect, it } from "vitest";

import type { ParticipantId, StoryId } from "@/domain/room/room";
import type { RoomId } from "@/domain/room/room-identity";
import type { CardId } from "@/domain/rules/deck";

import { applyCommand, isRevealComplete, type RefereeContext } from "./referee";
import type { RoomCommand } from "./room-command";
import { createRoomState, getCurrentRound, type RoomState } from "./room-state";

const HOST = "host" as ParticipantId;
const ANA = "ana" as ParticipantId;
const BEN = "ben" as ParticipantId;
const CHI = "chi" as ParticipantId;

function context(): RefereeContext {
  let next = 1;
  return { now: 1_000, newId: () => `id${next++}` };
}

/** Applies commands in order and fails the test on any refusal. */
function run(
  state: RoomState,
  steps: readonly [ParticipantId, RoomCommand][],
  ctx = context(),
): RoomState {
  return steps.reduce((current, [actor, command]) => {
    const result = applyCommand(current, actor, command, ctx);
    if (!result.ok) throw new Error(`${command.type} refused: ${result.refusal}`);
    return result.state;
  }, state);
}

function refusal(state: RoomState, actor: ParticipantId, command: RoomCommand) {
  const result = applyCommand(state, actor, command, context());
  return result.ok ? null : result.refusal;
}

const join = (asHost = false): RoomCommand => ({
  type: "join",
  profile: { displayName: null, avatarId: null },
  asHost,
});

/** A room with a host, three participants and two stories, the first one active. */
function setUp(ctx = context()): RoomState {
  const empty = createRoomState({
    roomId: "k7Qx9mP2vT4w" as RoomId,
    epicTitle: "Epic",
    createdAt: 0,
  });
  return run(
    empty,
    [
      [HOST, join(true)],
      [ANA, join()],
      [BEN, join()],
      [CHI, join()],
      [HOST, { type: "add-story", title: "First" }],
      [HOST, { type: "add-story", title: "Second" }],
    ],
    ctx,
  );
}

const storyId = (state: RoomState, index: number) => state.stories[index]!.id;

function votingRoom(): RoomState {
  return run(setUp(), [[HOST, { type: "start-round" }]]);
}

function reveal(state: RoomState, openings: readonly [ParticipantId, CardId][]): RoomState {
  return run(state, [
    [HOST, { type: "reveal" }],
    ...openings.map(([id, card]): [ParticipantId, RoomCommand] => [
      id,
      { type: "open-vote", card },
    ]),
    [HOST, { type: "finish-reveal" }],
  ]);
}

describe("referee: people", () => {
  it("puts the host first and refuses a second host (FR-003)", () => {
    const state = setUp();
    expect(state.participants.map((p) => p.id)).toEqual([HOST, ANA, BEN, CHI]);
    expect(refusal(state, BEN, join(true))).toBe("not-host");
  });

  it("refuses host actions from participants (PRD 8.7)", () => {
    expect(refusal(setUp(), ANA, { type: "start-round" })).toBe("not-host");
    expect(refusal(setUp(), "stranger" as ParticipantId, { type: "cast-vote" })).toBe(
      "not-in-room",
    );
  });

  it("expects late joiners to vote in the open round, but not the host (PRD 12.4)", () => {
    const state = run(votingRoom(), [["dev" as ParticipantId, join()]]);
    expect(getCurrentRound(state)?.expectedVoterIds).toEqual([ANA, BEN, CHI, "dev"]);
  });

  it("lets people rename themselves while the room is active (FR-049)", () => {
    const state = run(setUp(), [
      [ANA, { type: "update-profile", profile: { displayName: "Ana", avatarId: "fox" } }],
    ]);
    expect(state.participants[1]).toMatchObject({ displayName: "Ana", avatarId: "fox" });
    expect(
      refusal(setUp(), ANA, {
        type: "update-profile",
        profile: { displayName: "x".repeat(33), avatarId: null },
      }),
    ).toBe("invalid-profile");
  });
});

describe("referee: stories (PRD 12.2)", () => {
  it("activates the first story added and queues the rest", () => {
    const state = setUp();
    expect(state.stories.map((story) => story.status)).toEqual(["active", "queued"]);
    expect(state.activeStoryId).toBe(storyId(state, 0));
  });

  it("validates titles and the 500-story limit (FR-008, FR-048)", () => {
    expect(refusal(setUp(), HOST, { type: "add-story", title: "   " })).toBe("invalid-title");
    const full = {
      ...setUp(),
      stories: Array.from({ length: 500 }, (_, i) => ({
        id: `s${i}` as StoryId,
        title: "t",
        status: "queued" as const,
      })),
    };
    expect(refusal(full, HOST, { type: "add-story", title: "One more" })).toBe("story-limit");
  });

  it("renames and reorders stories (FR-009, FR-038)", () => {
    let state = setUp();
    const second = storyId(state, 1);
    state = run(state, [
      [HOST, { type: "rename-story", storyId: second, title: "  Renamed  " }],
      [HOST, { type: "move-story", storyId: second, toIndex: 0 }],
    ]);
    expect(state.stories.map((story) => story.title)).toEqual(["Renamed", "First"]);
  });

  it("deletes a story only while it has no rounds (FR-032, FR-039)", () => {
    let state = votingRoom();
    expect(refusal(state, HOST, { type: "delete-story", storyId: storyId(state, 0) })).toBe(
      "story-has-rounds",
    );
    state = run(state, [[HOST, { type: "delete-story", storyId: storyId(state, 1) }]]);
    expect(state.stories).toHaveLength(1);
  });

  it("removes and restores a story with its history kept (FR-032)", () => {
    let state = reveal(run(votingRoom(), [[ANA, { type: "cast-vote" }]]), [[ANA, "5"]]);
    const first = storyId(state, 0);
    state = run(state, [
      [HOST, { type: "activate-story", storyId: storyId(state, 1) }],
      [HOST, { type: "remove-story", storyId: first }],
    ]);
    expect(state.stories[0]?.status).toBe("removed");
    state = run(state, [[HOST, { type: "restore-story", storyId: first }]]);
    expect(state.stories[0]?.status).toBe("estimated");
    expect(state.rounds).toHaveLength(1);
  });

  it("won't remove the active story while its round is voting (PRD 12.2)", () => {
    const state = votingRoom();
    expect(refusal(state, HOST, { type: "remove-story", storyId: storyId(state, 0) })).toBe(
      "story-in-vote",
    );
  });

  it("cancels a voting round when the host switches story (FR-041)", () => {
    let state = run(votingRoom(), [[ANA, { type: "cast-vote" }]]);
    const round = getCurrentRound(state)!;
    state = run(state, [[HOST, { type: "activate-story", storyId: storyId(state, 1) }]]);

    expect(state.rounds.find((r) => r.id === round.id)).toMatchObject({
      status: "cancelled",
      votedIds: [],
      number: 1,
    });
    expect(state.stories.map((story) => story.status)).toEqual(["queued", "active"]);
    expect(state.currentRoundId).toBeNull();
  });
});

describe("referee: voting and reveal (PRD 9.3)", () => {
  it("opens a round expecting everyone online but the host", () => {
    const round = getCurrentRound(votingRoom())!;
    expect(round).toMatchObject({ number: 1, status: "voting", expectedVoterIds: [ANA, BEN, CHI] });
  });

  it("records one vote per person, however often they change it (FR-012)", () => {
    const state = run(votingRoom(), [
      [ANA, { type: "cast-vote" }],
      [ANA, { type: "cast-vote" }],
    ]);
    expect(getCurrentRound(state)?.votedIds).toEqual([ANA]);
  });

  it("refuses to reveal with no votes", () => {
    expect(refusal(votingRoom(), HOST, { type: "reveal" })).toBe("no-votes");
  });

  it("accepts no votes once the host reveals (FR-015)", () => {
    const state = run(votingRoom(), [
      [ANA, { type: "cast-vote" }],
      [HOST, { type: "reveal" }],
    ]);
    expect(getCurrentRound(state)?.status).toBe("revealing");
    expect(refusal(state, BEN, { type: "cast-vote" })).toBe("round-closed");
    expect(refusal(state, BEN, { type: "open-vote", card: "5" })).toBe("round-closed");
  });

  it("knows when every sealed vote is open", () => {
    let state = run(votingRoom(), [
      [ANA, { type: "cast-vote" }],
      [BEN, { type: "cast-vote" }],
      [HOST, { type: "reveal" }],
      [ANA, { type: "open-vote", card: "3" }],
    ]);
    expect(isRevealComplete(state)).toBe(false);
    state = run(state, [[BEN, { type: "open-vote", card: "5" }]]);
    expect(isRevealComplete(state)).toBe(true);
  });

  it("records votes, not voted and not revealed, with the host counted only if they vote", () => {
    let state = run(votingRoom(), [
      [HOST, { type: "cast-vote" }],
      [ANA, { type: "cast-vote" }],
      [BEN, { type: "cast-vote" }],
    ]);
    state = reveal(state, [
      [HOST, "8"],
      [ANA, "unsure"],
    ]);

    const round = getCurrentRound(state)!;
    expect(round.status).toBe("revealed");
    expect(round.revealedAt).toBe(1_000);
    expect(round.outcome?.votes.map((vote) => [vote.participantId, vote.card])).toEqual([
      [HOST, "8"],
      [ANA, "unsure"],
    ]);
    expect(round.outcome?.notRevealed.map((v) => v.participantId)).toEqual([BEN]);
    expect(round.outcome?.notVoted.map((v) => v.participantId)).toEqual([CHI]);
  });

  it("keeps the name a voter had at reveal (FR-049)", () => {
    let state = reveal(run(votingRoom(), [[ANA, { type: "cast-vote" }]]), [[ANA, "2"]]);
    state = run(state, [
      [ANA, { type: "update-profile", profile: { displayName: "Ana", avatarId: null } }],
    ]);
    expect(getCurrentRound(state)?.outcome?.votes[0]?.displayName).toBeNull();
  });

  it("starts a new round without touching earlier ones (FR-021)", () => {
    let state = reveal(run(votingRoom(), [[ANA, { type: "cast-vote" }]]), [[ANA, "2"]]);
    state = run(state, [[HOST, { type: "start-round" }]]);
    expect(state.rounds.map((round) => [round.number, round.status])).toEqual([
      [1, "revealed"],
      [2, "voting"],
    ]);
  });
});

describe("referee: timer (PRD 12.5)", () => {
  it("starts within bounds and stops on reveal", () => {
    let state = run(votingRoom(), [
      [HOST, { type: "start-timer", durationMs: 120_000 }],
      [ANA, { type: "cast-vote" }],
    ]);
    expect(state.timer).toEqual({ durationMs: 120_000, endsAt: 121_000 });
    state = run(state, [[HOST, { type: "reveal" }]]);
    expect(state.timer).toBeNull();
    expect(refusal(state, HOST, { type: "start-timer", durationMs: 10_000 })).toBe("invalid-timer");
  });

  it("clears when the story changes", () => {
    const state = run(setUp(), [
      [HOST, { type: "start-timer", durationMs: 60_000 }],
      [HOST, { type: "activate-story", storyId: storyId(setUp(), 1) }],
    ]);
    expect(state.timer).toBeNull();
  });
});

describe("referee: ending the room (PRD 9.6)", () => {
  it("cancels a voting round and then accepts only viewing", () => {
    let state = run(votingRoom(), [[ANA, { type: "cast-vote" }]]);
    state = run(state, [[HOST, { type: "end-room" }]]);

    expect(state.status).toBe("ended");
    expect(state.endedAt).toBe(1_000);
    expect(getCurrentRound(state)?.status).toBe("cancelled");
    expect(refusal(state, HOST, { type: "start-round" })).toBe("room-ended");
    expect(refusal(state, ANA, { type: "cast-vote" })).toBe("room-ended");
    expect(applyCommand(state, "late" as ParticipantId, join(), context()).ok).toBe(true);
  });
});
