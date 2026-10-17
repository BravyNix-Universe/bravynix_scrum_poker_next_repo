import type {
  ConnectionDiagnostics,
  OpenRoomRequest,
  RoomSession,
} from "@/application/ports/room-session";
import type {
  RoomSessionSimulation,
  SimulatedScenario,
} from "@/application/ports/room-session-simulation";
import { applyCommand, isRevealComplete } from "@/application/referee/referee";
import type { Refusal, RoomCommand } from "@/application/referee/room-command";
import {
  createRoomState,
  getCurrentRound,
  getHost,
  type RoomState,
} from "@/application/referee/room-state";
import type {
  ConnectionStatus,
  RoomNotice,
  RoomSessionState,
  SessionProblem,
} from "@/application/room/room-session-state";
import { toRoomLobby, toRoomView } from "@/application/room/room-view";
import type { MyRoomEntry } from "@/domain/my-rooms/my-room-entry";
import { getNextStory, type ParticipantId, type RoundId } from "@/domain/room/room";
import { type CardId, DECK, isCardId } from "@/domain/rules/deck";
import { REVEAL_DEADLINE_MS } from "@/domain/rules/lifecycle";

import { crowdTeammates, DEMO_HOST, TEAMMATES, type Teammate } from "./preview-people";

/**
 * A room that runs entirely inside this tab, for reviewing screens without a network
 * (`NEXT_PUBLIC_ROOM_MODE=preview`). It runs the real referee and simulates teammates (and,
 * for a participant, the host). It implements the same `RoomSession` port as live rooms, plus
 * `simulate` for acting out connection problems on request.
 */
export interface PreviewRoomOptions extends OpenRoomRequest {
  /** This device's "My rooms" entry for the room, if it has one. */
  listed: MyRoomEntry | null;
  now: () => number;
  random?: () => number;
}

const DEMO_EPIC = "Checkout revamp";
const DEMO_STORIES = [
  "Save cards for faster checkout",
  "Show delivery ETA on the order page",
  "Apply promo codes at checkout",
  "Retry failed UPI payments automatically",
];

/**
 * Everyone in a preview lives in this tab, so votes need no real seal: one shared placeholder
 * stands in for every fingerprint. Live rooms seal each vote with SHA-256 and a secret salt.
 */
const PREVIEW_SEAL = "preview";

const CONNECT_DELAY_MS = 700;
/** How long a simulated network drop lasts, and how long a participant waits for the host. */
const RECONNECT_DELAY_MS = 4_000;
const WAITING_FOR_HOST_MS = 5_000;
/** While the room is paused, simulated people check again this often. */
const PAUSED_RETRY_MS = 1_000;
const CROWD_SIZE = 24;
const CROWD_JOIN_INTERVAL_MS = 250;
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
}: PreviewRoomOptions): RoomSession & RoomSessionSimulation {
  const listeners = new Set<() => void>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let nextId = 1;
  const newId = () => `x${nextId++}`;

  type Phase = "connecting" | "waiting-for-host" | "lobby" | "joined" | "failed";
  let phase: Phase = "connecting";
  /** Where "Try again" or the host's arrival returns to. */
  let resumePhase: "lobby" | "joined" = "lobby";
  let problem: SessionProblem | null = null;
  let connection: ConnectionStatus = "connected";
  let notice: RoomNotice | null = null;
  let lastError: string | null = null;
  let me: ParticipantId | null = null;
  let myVote: CardId | null = null;
  /** Cards the simulated teammates chose. In a live room these stay on their own devices. */
  const teammateVotes = new Map<ParticipantId, CardId>();
  /** Index into NUMERIC_CARDS that this round's simulated votes cluster around. */
  let roundCentre = 3;
  let room: RoomState = role === "host" ? hostRoom() : demoRoom();
  let state: RoomSessionState = { status: "connecting" };
  let currentDiagnostics = diagnostics();

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
    const vote = (id: ParticipantId) => seed(id, { type: "cast-vote", seal: PREVIEW_SEAL }, 13);

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
      votes.forEach(([id, card]) =>
        seed(id, { type: "open-vote", card, fingerprint: PREVIEW_SEAL }, 12),
      );
      seed(host, { type: "finish-reveal" }, 12);
    }

    // Story 2 is being estimated now, with a three-minute timer running.
    const second = seeded.stories[1]!;
    seed(host, { type: "activate-story", storyId: second.id }, 4);
    seed(host, { type: "start-round" }, 2);
    seed(host, { type: "start-timer", durationMs: 180_000 }, 0.75);
    [team[0]!.id, team[1]!.id].forEach((id) => {
      seed(id, { type: "cast-vote", seal: PREVIEW_SEAL }, 1);
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
    currentDiagnostics = diagnostics();
    listeners.forEach((listener) => listener());
  }

  function snapshot(): RoomSessionState {
    switch (phase) {
      case "connecting":
      case "waiting-for-host":
        return { status: phase };
      case "failed":
        return { status: "failed", problem: problem ?? "host-unreachable" };
      case "lobby":
        return { status: "lobby", lobby: toRoomLobby(room, role) };
      case "joined":
        return me
          ? { status: "joined", view: toRoomView(room, me, myVote), connection, notice }
          : { status: "lobby", lobby: toRoomLobby(room, role) };
    }
  }

  /** Runs a command through the referee; on success reacts to the change and notifies. */
  function dispatch(actor: ParticipantId, command: RoomCommand): Refusal | null {
    const result = applyCommand(room, actor, command, { now: now(), newId });
    if (!result.ok) return result.refusal;
    const before = room;
    room = result.state;
    react(before);
    emit();
    return null;
  }

  /** Tells this device why the room refused one of its commands (PRD 8.7). */
  function refuse(refusal: Refusal): void {
    notice = { id: (notice?.id ?? 0) + 1, refusal };
    emit();
  }

  /** People can't reach the host while it's away, the network is down or the room is failing. */
  const isPaused = () => connection !== "connected" || (phase !== "lobby" && phase !== "joined");

  /** Schedules something a simulated person does. It waits while the room is paused. */
  function schedule(delayMs: number, task: () => void): void {
    scheduleControl(delayMs, () => (isPaused() ? schedule(PAUSED_RETRY_MS, task) : task()));
  }

  /** Schedules a change to the connection itself, which never waits. */
  function scheduleControl(delayMs: number, task: () => void): void {
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
        if (!dispatch(person.id, { type: "cast-vote", seal: PREVIEW_SEAL })) maybeHostReveals();
      });
    }
  }

  /** At reveal every voter's device opens its sealed vote; late ones miss the deadline. */
  function scheduleOpenings(roundId: RoundId): void {
    const round = getCurrentRound(room);
    if (!round) return;
    const open = (id: ParticipantId, card: CardId | undefined | null) => {
      if (!card || !isCurrent(roundId, "revealing")) return;
      dispatch(id, { type: "open-vote", card, fingerprint: PREVIEW_SEAL });
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

  // --- Connection ----------------------------------------------------------------------------

  /** Leaves the room's current phase for a waiting or failed one, remembering where to return. */
  function interrupt(next: "waiting-for-host" | "failed"): void {
    if (phase === "lobby" || phase === "joined") resumePhase = phase;
    phase = next;
    emit();
  }

  function resume(): void {
    phase = resumePhase;
    problem = null;
    emit();
  }

  function simulate(scenario: SimulatedScenario): void {
    switch (scenario) {
      case "connection-drop":
        if (phase !== "joined" || connection !== "connected") return;
        connection = "reconnecting";
        lastError = "connection-lost";
        emit();
        scheduleControl(RECONNECT_DELAY_MS, () => {
          if (connection !== "reconnecting") return;
          connection = "connected";
          emit();
        });
        return;
      case "host-away":
        if (phase !== "joined" || role !== "participant") return;
        connection = "host-away";
        lastError = "host-disconnected";
        emit();
        return;
      case "host-back":
        if (connection !== "host-away") return;
        connection = "connected";
        emit();
        return;
      case "waiting-for-host":
        if (role !== "participant") return;
        interrupt("waiting-for-host");
        scheduleControl(WAITING_FOR_HOST_MS, () => {
          if (phase === "waiting-for-host") resume();
        });
        return;
      case "rate-limited":
        if (phase === "joined") refuse("rate-limited");
        return;
      case "crowd":
        crowdTeammates(CROWD_SIZE).forEach((mate, index) =>
          schedule(CROWD_JOIN_INTERVAL_MS * (index + 1), () => teammateJoins(mate)),
        );
        return;
      default:
        problem = scenario;
        lastError = scenario;
        interrupt("failed");
    }
  }

  function diagnostics(): ConnectionDiagnostics {
    const current = phase;
    const inRoom = current === "lobby" || current === "joined";
    return {
      state: current === "joined" ? connection : current === "lobby" ? "connected" : current,
      path: inRoom && connection === "connected" ? "in-tab" : null,
      serviceReachable: problem === "service-unreachable" ? false : null,
      lastError,
    };
  }

  scheduleControl(CONNECT_DELAY_MS, () => {
    phase = "lobby";
    emit();
  });

  // --- Commands --------------------------------------------------------------------------------

  /** Commands from this device. The referee refuses anything it shouldn't accept. */
  const send = (command: RoomCommand) => {
    if (!me) return;
    const refusal = dispatch(me, command);
    if (refusal) refuse(refusal);
  };

  function close(): void {
    timers.forEach((timer) => clearTimeout(timer));
    timers.clear();
    listeners.clear();
  }

  return {
    getState: () => state,

    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },

    retry() {
      if (phase !== "failed") return;
      phase = "connecting";
      emit();
      scheduleControl(CONNECT_DELAY_MS, resume);
    },

    getDiagnostics: () => currentDiagnostics,
    simulate,

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
      if (!me || connection !== "connected") return;
      if (!isCardId(card)) return refuse("invalid-card");
      const result = applyCommand(
        room,
        me,
        { type: "cast-vote", seal: PREVIEW_SEAL },
        { now: now(), newId },
      );
      if (!result.ok) return refuse(result.refusal);
      room = result.state;
      myVote = card;
      emit();
      maybeHostReveals();
    },

    close,

    /** The preview keeps nothing on the device, so there is nothing more to delete. */
    async forget() {
      if (role === "host" && me && room.status === "active") send({ type: "end-room" });
      close();
    },
  };
}
