import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { RoomSession } from "@/application/ports/room-session";
import type { RoomView } from "@/application/room/room-view";
import type { RoomId } from "@/domain/room/room-identity";

import { createPreviewRoomSession } from "./preview-room-session";

const ROOM_ID = "k7Qx9mP2vT4w" as RoomId;
const NOW = Date.UTC(2026, 9, 17, 6, 0, 0);

function open(role: "host" | "participant"): RoomSession {
  return createPreviewRoomSession({
    roomId: ROOM_ID,
    role,
    listed:
      role === "host"
        ? {
            roomId: ROOM_ID,
            epicTitle: "Checkout revamp",
            role: "host",
            createdAt: NOW,
            expiresAt: NOW + 86_400_000,
          }
        : null,
    now: () => NOW,
    random: () => 0,
  });
}

function view(session: RoomSession): RoomView {
  const state = session.getState();
  if (state.status !== "joined") throw new Error(`Expected joined, got ${state.status}`);
  return state.view;
}

describe("preview room session", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("connects, shows the lobby and joins", async () => {
    const session = open("host");
    expect(session.getState()).toEqual({ status: "connecting" });

    vi.advanceTimersByTime(1_000);
    expect(session.getState()).toMatchObject({
      status: "lobby",
      lobby: { epicTitle: "Checkout revamp", role: "host" },
    });

    await session.join({ displayName: "Priya", avatarId: "panda" });
    expect(view(session).participants).toEqual([
      expect.objectContaining({ displayName: "Priya", isHost: true, id: view(session).me }),
    ]);
    session.close();
  });

  it("lets the host add a story, start estimation and vote, while teammates vote", async () => {
    const session = open("host");
    vi.advanceTimersByTime(1_000);
    await session.join({ displayName: "Priya", avatarId: "panda" });
    vi.advanceTimersByTime(10_000);

    session.addStory("Show delivery ETA on the order page");
    const story = view(session).stories[0]!;
    expect(view(session).activeStoryId).toBe(story.id);
    expect(view(session).round).toBeNull();

    session.startRound();
    expect(view(session).round).toMatchObject({ number: 1, status: "voting", votedIds: [] });

    session.castVote("5");
    session.castVote("8");
    expect(view(session).myVote).toBe("8");
    expect(view(session).round?.votedIds).toEqual([view(session).me]);

    vi.advanceTimersByTime(20_000);
    expect(view(session).round?.votedIds.length).toBe(view(session).participants.length);
    session.close();
  });

  it("reveals: every voter's device opens its vote and the round records the outcome", async () => {
    const session = open("host");
    vi.advanceTimersByTime(1_000);
    await session.join({ displayName: "Priya", avatarId: "panda" });
    vi.advanceTimersByTime(10_000);
    session.addStory("Show delivery ETA on the order page");
    session.startRound();
    session.castVote("5");
    vi.advanceTimersByTime(20_000);

    session.reveal();
    expect(view(session).round?.status).toBe("revealing");
    vi.advanceTimersByTime(5_000);

    const round = view(session).round!;
    expect(round.status).toBe("revealed");
    expect(round.outcome?.votes).toContainEqual(
      expect.objectContaining({ participantId: view(session).me, card: "5" }),
    );
    expect(round.outcome?.votes).toHaveLength(view(session).participants.length);
    expect(view(session).myVote).toBeNull();
    session.close();
  });

  it("drops a participant into a room in progress, with history and a timer", async () => {
    const session = open("participant");
    vi.advanceTimersByTime(1_000);
    await session.join({ displayName: null, avatarId: null });

    const current = view(session);
    expect(current.rounds.filter((round) => round.status === "revealed")).toHaveLength(2);
    expect(current.round).toMatchObject({ status: "voting", number: 1 });
    expect(current.timer).not.toBeNull();
    expect(current.stories.map((story) => story.status)).toEqual([
      "estimated",
      "active",
      "queued",
      "removed",
    ]);
    session.close();
  });

  it("has the simulated host reveal once everyone has voted", async () => {
    const session = open("participant");
    vi.advanceTimersByTime(1_000);
    await session.join({ displayName: null, avatarId: null });
    session.castVote("3");
    vi.advanceTimersByTime(7_000);
    expect(view(session).round?.status).toBe("revealed");

    // A little later the host moves to the next story and opens its first round.
    vi.advanceTimersByTime(15_000);
    expect(view(session).round).toMatchObject({ status: "voting", number: 1 });
    expect(view(session).stories[2]?.status).toBe("active");
    session.close();
  });

  it("refuses host actions from participants", async () => {
    const session = open("participant");
    vi.advanceTimersByTime(1_000);
    await session.join({ displayName: null, avatarId: null });

    const before = view(session);
    session.addStory("Another story");
    session.startRound();
    expect(view(session).stories).toEqual(before.stories);
    expect(before.round?.expectedVoterIds).toContain(before.me);
    session.close();
  });
});
