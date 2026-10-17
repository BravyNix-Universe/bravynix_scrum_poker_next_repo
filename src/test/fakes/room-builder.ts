import { applyCommand, type RefereeContext } from "@/application/referee/referee";
import type { RoomCommand } from "@/application/referee/room-command";
import { createRoomState, type RoomState } from "@/application/referee/room-state";
import type { ParticipantId } from "@/domain/room/room";
import type { RoomId } from "@/domain/room/room-identity";

export type RoomStep = readonly [actor: ParticipantId, command: RoomCommand];

export const joinAs = (displayName: string, asHost = false): RoomCommand => ({
  type: "join",
  profile: { displayName, avatarId: null },
  asHost,
});

/**
 * A room built the way a real one is: by running commands through the referee. Story and round
 * IDs come out as id1, id2, … in creation order. Any refusal fails the test. `onStep` sees the
 * state after each step.
 */
export function buildRoom(
  steps: readonly RoomStep[],
  now = Date.now(),
  onStep?: (state: RoomState) => void,
): RoomState {
  let next = 1;
  const context: RefereeContext = { now, newId: () => `id${next++}` };
  const empty = createRoomState({
    roomId: "k7Qx9mP2vT4w" as RoomId,
    epicTitle: "Checkout revamp",
    createdAt: now,
  });
  return steps.reduce((state, [actor, command]) => {
    const result = applyCommand(state, actor, command, context);
    if (!result.ok) throw new Error(`${command.type} refused: ${result.refusal}`);
    onStep?.(result.state);
    return result.state;
  }, empty);
}
