import { vi } from "vitest";

import type { RoomSession } from "@/application/ports/room-session";
import type { RoomLobby, RoomSessionState } from "@/application/room/room-view";
import type { RoomId } from "@/domain/room/room-identity";

export const FAKE_LOBBY: RoomLobby = {
  roomId: "k7Qx9mP2vT4w" as RoomId,
  epicTitle: "Checkout revamp",
  createdAt: Date.UTC(2026, 9, 17, 4, 0, 0),
  expiresAt: Date.UTC(2026, 9, 18, 4, 0, 0),
  role: "participant",
  participants: [],
};

/** A `RoomSession` test double whose commands are spies. */
export function createFakeRoomSession(
  state: RoomSessionState = { status: "lobby", lobby: FAKE_LOBBY },
) {
  return {
    getState: () => state,
    subscribe: () => () => undefined,
    join: vi.fn(async () => undefined),
    updateProfile: vi.fn(),
    addStory: vi.fn(),
    renameStory: vi.fn(),
    moveStory: vi.fn(),
    removeStory: vi.fn(),
    restoreStory: vi.fn(),
    deleteStory: vi.fn(),
    activateStory: vi.fn(),
    startRound: vi.fn(),
    castVote: vi.fn(),
    reveal: vi.fn(),
    startTimer: vi.fn(),
    stopTimer: vi.fn(),
    endRoom: vi.fn(),
    close: vi.fn(),
  } satisfies RoomSession;
}
