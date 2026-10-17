import { describe, expect, it } from "vitest";

import { type RoomState, toSharedState } from "@/application/referee/room-state";
import type { ParticipantId } from "@/domain/room/room";
import { buildRoom, joinAs, type RoomStep } from "@/test/fakes/room-builder";

import { applyStatePatch, diffSharedState, isEmptyPatch } from "./state-patch";

const HOST = "host" as ParticipantId;
const ANA = "ana" as ParticipantId;
const SEAL = "c2VhbGVk";

const START: RoomStep[] = [
  [HOST, joinAs("Priya", true)],
  [ANA, joinAs("Ana")],
  [HOST, { type: "add-story", title: "Saved cards" }],
  [HOST, { type: "start-round" }],
];

/** The same room before and after `more`, built in one run so unchanged values keep identity. */
function beforeAndAfter(more: RoomStep[]): [RoomState, RoomState] {
  const states: RoomState[] = [];
  buildRoom([...START, ...more], 1_000, (state) => states.push(state));
  return [states[START.length - 1]!, states.at(-1)!];
}

describe("state patches (SDD 12)", () => {
  it("sends only what changed, and rebuilds the same state on the other side", () => {
    const [before, after] = beforeAndAfter([[ANA, { type: "cast-vote", seal: SEAL }]]);
    const patch = diffSharedState(toSharedState(before), toSharedState(after));

    expect(Object.keys(patch.fields)).toEqual([]);
    expect(patch.rounds.map((round) => round.votedIds)).toEqual([[ANA]]);

    // The other device holds a JSON copy, so identities differ there.
    const copy = JSON.parse(JSON.stringify(toSharedState(before)));
    const wire = JSON.parse(JSON.stringify(patch));
    expect(applyStatePatch(copy, wire)).toEqual(JSON.parse(JSON.stringify(toSharedState(after))));
  });

  it("appends new rounds and carries changed top-level values", () => {
    const [before, after] = beforeAndAfter([
      [ANA, { type: "cast-vote", seal: SEAL }],
      [HOST, { type: "start-round" }],
      [HOST, { type: "add-story", title: "Guest checkout" }],
    ]);
    const patch = diffSharedState(toSharedState(before), toSharedState(after));

    expect(Object.keys(patch.fields).sort()).toEqual(["currentRoundId", "stories"]);
    expect(patch.rounds.map((round) => [round.number, round.status])).toEqual([
      [1, "cancelled"],
      [2, "voting"],
    ]);
    expect(applyStatePatch(toSharedState(before), patch)).toEqual(toSharedState(after));
  });

  it("recognises when nothing changed", () => {
    const [, after] = beforeAndAfter([]);
    expect(isEmptyPatch(diffSharedState(toSharedState(after), toSharedState(after)))).toBe(true);
  });
});
