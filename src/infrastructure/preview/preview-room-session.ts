import type { OpenRoomRequest, RoomSession } from "@/application/ports/room-session";
import { applyCommand, isRevealComplete } from "@/application/referee/referee";
import type { RoomCommand } from "@/application/referee/room-command";
import {
  createRoomState,
  getCurrentRound,
  getHost,
  type RoomState,
} from "@/application/referee/room-state";
import { type RoomSessionState, toRoomLobby, toRoomView } from "@/application/room/room-view";
import type { AvatarId } from "@/domain/avatars/avatars";
import type { MyRoomEntry } from "@/domain/my-rooms/my-room-entry";
import { getNextStory, type ParticipantId, type RoundId } from "@/domain/room/room";
import { type CardId, DECK, isCardId } from "@/domain/rules/deck";
import { REVEAL_DEADLINE_MS } from "@/domain/rules/lifecycle";

/**
 * A stand-in for the peer-to-peer room session until live connections arrive (Phase 5).
 * It runs the real referee inside this tab and simulates teammates (and, for a participant,
 * the host), so every screen can be reviewed without a network. It implements the same
 * `RoomSession` port the live session will.
 */
export interface PreviewRoomOptions extends OpenRoomRequest {
  /** This device's "My rooms" entry for the room, if it has one. */
  listed: MyRoomEntry | null;
  now: () => number;
  random?: () => number;
}

interface Teammate {
  id: ParticipantId;
  displayName: string;
  avatarId: AvatarId;
}

const DEMO_HOST: Teammate = {
  id: "demo-host" as ParticipantId,
  displayName: "Priya",
  avatarId: "panda",
};
const TEAMMATES: readonly Teammate[] = [
  { id: "demo-arjun" as ParticipantId, displayName: "Arjun", avatarId: "tiger" },
  { id: "demo-meera" as ParticipantId, displayName: "Meera", avatarId: "fox" },
  { id: "demo-rahul" as ParticipantId, displayName: "Rahul", avatarId: "man-beard-medium" },
  {
    id: "demo-ananya" as ParticipantId,
    displayName: "Ananya",
    avatarId: "woman-curly-hair-medium",
  },
  { id: "demo-vikram" as ParticipantId, displayName: "Vikram", avatarId: "owl" },
];
const DEMO_EPIC = "Checkout revamp";
const DEMO_STORIES = [
  "Save cards for faster checkout",
  "Show delivery ETA on the order page",
  "Apply promo codes at checkout",
  "Retry failed UPI payments automatically",
];

const CONNECT_DELAY_MS = 700;
const TEAMMATE_JOIN_INTERVAL_MS = 1_200;
const VOTE_DELAY_MIN_MS = 2_000;
const VOTE_DELAY_SPREAD_MS = 10_000;
const OPEN_DELAY_MIN_MS = 250;
const OPEN_DELAY_SPREAD_MS = 900;
/** The simulated host's pace, when this device is a participant. */
const HOST_REVEAL_DELAY_MS = 2_500;
const HOST_REVEAL_FALLBACK_MS = 45_000;
const HOST_NEXT_STORY_DELAY_MS = 9_000;
const HOST_START_ROUND_DELAY_MS = 5_000;

/** Numeric cards a simulated teammate may pick, in deck order. */
const NUMERIC_CARDS = DECK.filter((card) => card.halfPoints !== null).map((card) => card.id);

export function createPreviewRoomSession({
  roomId,
  role,
  listed,
  now,
  random = Math.random,
}: PreviewRoomOptions): RoomSession {
  const listeners = new Set<() => void>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let nextId = 1;
  const newId = () => `x${nextId++}`;

  let phase: "connecting" | "lobby" | "joined" = "connecting";
  let me: ParticipantId | null = null;
  let myVote: CardId | null = null;
  /** Cards the simulated teammates chose. In a live room these stay on their own devices. */
  const teammateVotes = new Map<ParticipantId, CardId>();
  /** Index into NUMERIC_CARDS that this round's simulated votes cluster around. */
  let roundCentre = 3;
  let room: RoomState = role === "host" ? hostRoom() : demoRoom();
  let state: RoomSessionState = { status: "connecting" };

  function hostRoom(): RoomState {
    const base = createRoomState({
      roomId,
      epicTitle: listed?.epicTitle ?? "Preview room",
      createdAt: listed?.createdAt ?? now(),
    });
    return listed ? { ...base, expiresAt: listed.expiresAt } : base;
  }

  /** A room already in progress, as a participant would find it, built with the real referee. */
  function demoRoom(): RoomState {
    const start = now() - 16 * 60_000;
    let seeded = createRoomState({
      roomId,
      epicTitle: listed?.epicTitle ?? DEMO_EPIC,
      createdAt: start,
    });
    const seed = (actor: ParticipantId, command: RoomCommand, minutesAgo: number) => {
      const result = applyCommand(seeded, actor, command, {
        now: now() - minutesAgo * 60_000,
        newId,
      });
      if (result.ok) seeded = result.state;
    };
    const host = DEMO_HOST.id;
    const team = TEAMMATES.slice(0, 4);
    const vote = (id: ParticipantId) => seed(id, { type: "cast-vote" }, 13);

    seed(host, { type: "join", profile: profileOf(DEMO_HOST), asHost: true }, 16);
    team.forEach((mate) =>
      seed(mate.id, { type: "join", profile: profileOf(mate), asHost: false }, 15),
    );
    DEMO_STORIES.forEach((title) => seed(host, { type: "add-story", title }, 15));

    // Story 1: a wide first round, then a re-vote that settled closer together.
    const firstRound: readonly [ParticipantId, CardId][] = [
      [host, "5"],
      [team[0]!.id, "3"],
      [team[1]!.id, "8"],
      [team[2]!.id, "13"],
      [team[3]!.id, "unsure"],
    ];
    const secondRound: readonly [ParticipantId, CardId][] = [
      [host, "5"],
      [team[0]!.id, "5"],
      [team[1]!.id, "5"],
      [team[2]!.id, "8"],
    ];
    for (const votes of [firstRound, secondRound]) {
      seed(host, { type: "start-round" }, 14);
      votes.forEach(([id]) => vote(id));
      seed(host, { type: "reveal" }, 12);
      votes.forEach(([id, card]) => seed(id, { type: "open-vote", card }, 12));
      seed(host, { type: "finish-reveal" }, 12);
    }

    // Story 2 is being estimated now, with a three-minute timer running.
    const second = seeded.stories[1]!;
    seed(host, { type: "activate-story", storyId: second.id }, 4);
    seed(host, { type: "start-round" }, 2);
    seed(host, { type: "start-timer", durationMs: 180_000 }, 0.75);
    [team[0]!.id, team[1]!.id].forEach((id) => {
      seed(id, { type: "cast-vote" }, 1);
      teammateVotes.set(id, pickCard());
    });
    // The fourth story was set aside earlier; its title stays in the removed list.
    seed(host, { type: "remove-story", storyId: seeded.stories[3]!.id }, 3);
    return seeded;
  }

  function profileOf(mate: Teammate) {
    return { displayName: mate.displayName, avatarId: mate.avatarId };
  }

  // --- State and change notification -------------------------------------------------------

  function emit(): void {
    state = snapshot();
    listeners.forEach((listener) => listener());
  }

  function snapshot(): RoomSessionState {
    if (phase === "connecting") return { status: "connecting" };
    if (phase === "lobby" || !me) return { status: "lobby", lobby: toRoomLobby(room, role) };
    return { status: "joined", view: toRoomView(room, me, myVote) };
  }

  /** Runs a command through the referee; on success reacts to the change and notifies. */
  function dispatch(actor: ParticipantId, command: RoomCommand): boolean {
    const result = applyCommand(room, actor, command, { now: now(), newId });
    if (!result.ok) return false;
    const before = room;
    room = result.state;
    react(before);
    emit();
    return true;
  }

  function schedule(delayMs: number, task: () => void): void {
    const timer = setTimeout(() => {
      timers.delete(timer);
      task();
    }, delayMs);
    timers.add(timer);
  }

  const hostId = () => getHost(room)?.id ?? null;
  const isCurrent = (roundId: RoundId, status: string) => {
    const round = getCurrentRound(room);
    return round?.id === roundId && round.status === status;
  };

  // --- Simulation ----------------------------------------------------------------------------

  /** Moves the simulated people along whenever the round changes. */
  function react(before: RoomState): void {
    const previous = getCurrentRound(before);
    const round = getCurrentRound(room);
    if (round?.id !== previous?.id) {
      myVote = null;
      teammateVotes.clear();
      if (round?.status === "voting") onRoundOpened(round.id);
      return;
    }
    if (!round || round.status === previous?.status) return;
    if (round.status === "revealing") scheduleOpenings(round.id);
    if (round.status === "revealed" || round.status === "cancelled") {
      myVote = null;
      teammateVotes.clear();
    }
    if (round.status === "revealed" && role === "participant") hostMovesOn();
  }

  function onRoundOpened(roundId: RoundId): void {
    scheduleTeammateVotes();
    if (role === "participant") {
      schedule(HOST_REVEAL_FALLBACK_MS, () => {
        if (isCurrent(roundId, "voting")) hostReveals();
      });
    }
  }

  /** A teammate's pick: mostly near the round's centre, sometimes "?" (PRD 11.1). */
  function pickCard(): CardId {
    const roll = random();
    if (roll < 0.08) return "unsure";
    const offset = roll < 0.6 ? 0 : roll < 0.82 ? 1 : -1;
    const index = Math.min(NUMERIC_CARDS.length - 1, Math.max(0, roundCentre + offset));
    return NUMERIC_CARDS[index]!;
  }

  /** Simulated teammates vote after a short, random think. */
  function scheduleTeammateVotes(): void {
    const round = getCurrentRound(room);
    if (round?.status !== "voting") return;
    roundCentre = 3 + Math.floor(random() * 4);
    for (const person of room.participants) {
      if (person.id === me || person.isHost || !person.online) continue;
      if (round.votedIds.includes(person.id)) continue;
      schedule(VOTE_DELAY_MIN_MS + random() * VOTE_DELAY_SPREAD_MS, () => {
        if (!isCurrent(round.id, "voting")) return;
        teammateVotes.set(person.id, pickCard());
        if (dispatch(person.id, { type: "cast-vote" })) maybeHostReveals();
      });
    }
  }

  /** At reveal every voter's device opens its sealed vote; late ones miss the deadline. */
  function scheduleOpenings(roundId: RoundId): void {
    const round = getCurrentRound(room);
    if (!round) return;
    const open = (id: ParticipantId, card: CardId | undefined | null) => {
      if (!card || !isCurrent(roundId, "revealing")) return;
      dispatch(id, { type: "open-vote", card });
      if (isRevealComplete(room)) finishReveal(roundId);
    };
    for (const id of round.votedIds) {
      if (id === me) {
        const card = myVote;
        schedule(150, () => open(id, card));
      } else {
        const card = teammateVotes.get(id) ?? pickCard();
        schedule(OPEN_DELAY_MIN_MS + random() * OPEN_DELAY_SPREAD_MS, () => open(id, card));
      }
    }
    schedule(REVEAL_DEADLINE_MS, () => finishReveal(roundId));
  }

  function finishReveal(roundId: RoundId): void {
    const host = hostId();
    if (host && isCurrent(roundId, "revealing")) dispatch(host, { type: "finish-reveal" });
  }

  /** The simulated host reveals once everyone expected has voted. */
  function maybeHostReveals(): void {
    if (role !== "participant") return;
    const round = getCurrentRound(room);
    if (round?.status !== "voting") return;
    const waiting = round.expectedVoterIds.some((id) => !round.votedIds.includes(id));
    if (!waiting) schedule(HOST_REVEAL_DELAY_MS, hostReveals);
  }

  function hostReveals(): void {
    const host = hostId();
    if (host) dispatch(host, { type: "reveal" });
  }

  /** After a reveal, the simulated host moves to the next story and opens a round. */
  function hostMovesOn(): void {
    schedule(HOST_NEXT_STORY_DELAY_MS, () => {
      const host = hostId();
      const active = room.activeStoryId;
      if (!host || !active || room.status !== "active") return;
      if (getCurrentRound(room)?.status !== "revealed") return;
      const next = getNextStory(room.stories, active);
      if (!next || next.status !== "queued") return;
      dispatch(host, { type: "activate-story", storyId: next.id });
      schedule(HOST_START_ROUND_DELAY_MS, () => {
        if (room.activeStoryId === next.id && !getCurrentRound(room)) {
          dispatch(host, { type: "start-round" });
        }
      });
    });
  }

  function teammateJoins(mate: Teammate): void {
    dispatch(mate.id, { type: "join", profile: profileOf(mate), asHost: false });
    scheduleTeammateVotes();
  }

  schedule(CONNECT_DELAY_MS, () => {
    phase = "lobby";
    emit();
  });

  // --- Commands --------------------------------------------------------------------------------

  /** Commands from this device. The referee refuses anything it shouldn't accept. */
  const send = (command: RoomCommand) => {
    if (me) dispatch(me, command);
  };

  return {
    getState: () => state,

    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },

    async join(profile) {
      if (phase !== "lobby") return;
      const id = `me${newId()}` as ParticipantId;
      const result = applyCommand(
        room,
        id,
        { type: "join", profile, asHost: role === "host" },
        { now: now(), newId },
      );
      if (!result.ok) throw new Error(`Join refused: ${result.refusal}`);
      room = result.state;
      me = id;
      phase = "joined";
      emit();

      if (role === "host") {
        TEAMMATES.forEach((mate, index) =>
          schedule(TEAMMATE_JOIN_INTERVAL_MS * (index + 1), () => teammateJoins(mate)),
        );
      } else {
        const round = getCurrentRound(room);
        if (round?.status === "voting") onRoundOpened(round.id);
      }
    },

    updateProfile: (profile) => send({ type: "update-profile", profile }),
    addStory: (title) => send({ type: "add-story", title }),
    renameStory: (storyId, title) => send({ type: "rename-story", storyId, title }),
    moveStory: (storyId, toIndex) => send({ type: "move-story", storyId, toIndex }),
    removeStory: (storyId) => send({ type: "remove-story", storyId }),
    restoreStory: (storyId) => send({ type: "restore-story", storyId }),
    deleteStory: (storyId) => send({ type: "delete-story", storyId }),
    activateStory: (storyId) => send({ type: "activate-story", storyId }),
    startRound: () => send({ type: "start-round" }),
    reveal: () => send({ type: "reveal" }),
    startTimer: (durationMs) => send({ type: "start-timer", durationMs }),
    stopTimer: () => send({ type: "stop-timer" }),
    endRoom: () => send({ type: "end-room" }),

    castVote(card) {
      if (!me || !isCardId(card)) return;
      const result = applyCommand(room, me, { type: "cast-vote" }, { now: now(), newId });
      if (!result.ok) return;
      room = result.state;
      myVote = card;
      emit();
      maybeHostReveals();
    },

    close() {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
      listeners.clear();
    },
  };
}
