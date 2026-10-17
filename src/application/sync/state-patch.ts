import type { Round } from "@/domain/room/room";

import type { SharedRoomState } from "../referee/room-state";

type Fields = Omit<SharedRoomState, "rounds">;

/**
 * The difference between two versions of the shared room state, as the host sends it after
 * each change (SDD 12, `event`). Rounds are sent individually because History grows with every
 * round; they are only ever added or changed, never removed.
 */
export interface StatePatch {
  /** Top-level values that changed, other than rounds. */
  fields: Partial<Fields>;
  /** Rounds that were added or changed, oldest first. */
  rounds: readonly Round[];
}

/**
 * What changed from `before` to `after`. The referee never mutates state, so an unchanged
 * value keeps its identity and identity comparison is enough.
 */
export function diffSharedState(before: SharedRoomState, after: SharedRoomState): StatePatch {
  const fields: Partial<Record<keyof Fields, unknown>> = {};
  for (const key of Object.keys(after) as (keyof SharedRoomState)[]) {
    if (key !== "rounds" && after[key] !== before[key]) fields[key] = after[key];
  }
  const previous = new Map(before.rounds.map((round) => [round.id, round]));
  return {
    fields: fields as Partial<Fields>,
    rounds: after.rounds.filter((round) => previous.get(round.id) !== round),
  };
}

export function isEmptyPatch(patch: StatePatch): boolean {
  return Object.keys(patch.fields).length === 0 && patch.rounds.length === 0;
}

/** Applies a patch the way the host produced it: changed rounds replace, new rounds append. */
export function applyStatePatch(state: SharedRoomState, patch: StatePatch): SharedRoomState {
  const changed = new Map(patch.rounds.map((round) => [round.id, round]));
  const known = new Set(state.rounds.map((round) => round.id));
  const rounds = [
    ...state.rounds.map((round) => changed.get(round.id) ?? round),
    ...patch.rounds.filter((round) => !known.has(round.id)),
  ];
  return { ...state, ...patch.fields, rounds };
}
