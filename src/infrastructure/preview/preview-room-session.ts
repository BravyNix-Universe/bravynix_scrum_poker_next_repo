import type { OpenRoomRequest, RoomSession } from "@/application/ports/room-session";
import type { RoomSessionState } from "@/application/room/room-view";
import type { AvatarId } from "@/domain/avatars/avatars";
import type { MyRoomEntry } from "@/domain/my-rooms/my-room-entry";
import type { Profile } from "@/domain/room/profile";
import type { Participant, ParticipantId, Round, Story, StoryId } from "@/domain/room/room";
import type { CardId } from "@/domain/rules/deck";
import { roomExpiresAt } from "@/domain/rules/lifecycle";
import { LIMITS } from "@/domain/rules/limits";
import { validateTitle } from "@/domain/rules/text";

/**
 * A stand-in for the peer-to-peer room session until live connections arrive (Phase 5).
 * It runs the room inside this tab and simulates teammates, so every screen can be reviewed
 * without a network. It implements the same `RoomSession` port the real session will.
 */
export interface PreviewRoomOptions extends OpenRoomRequest {
  /** This device's "My rooms" entry for the room, if it has one. */
  listed: MyRoomEntry | null;
  now: () => number;
  random?: () => number;
}

interface Teammate {
  displayName: string;
  avatarId: AvatarId;
}

const DEMO_HOST: Teammate = { displayName: "Priya", avatarId: "panda" };
const TEAMMATES: readonly Teammate[] = [
  { displayName: "Arjun", avatarId: "tiger" },
  { displayName: "Meera", avatarId: "fox" },
  { displayName: "Rahul", avatarId: "man-beard-medium" },
  { displayName: "Ananya", avatarId: "woman-curly-hair-medium" },
  { displayName: "Vikram", avatarId: "owl" },
];
const DEMO_STORIES = [
  "Save cards for faster checkout",
  "Show delivery ETA on the order page",
  "Apply promo codes at checkout",
];

const CONNECT_DELAY_MS = 700;
const TEAMMATE_JOIN_INTERVAL_MS = 1_200;
const VOTE_DELAY_MIN_MS = 2_000;
const VOTE_DELAY_SPREAD_MS = 12_000;

interface RoomData {
  epicTitle: string;
  createdAt: number;
  expiresAt: number;
  participants: Participant[];
  stories: Story[];
  activeStoryId: StoryId | null;
  rounds: Round[];
  currentRound: Round | null;
}

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
  const newId = <T extends string>(prefix: string) => `${prefix}${nextId++}` as T;

  let phase: "connecting" | "lobby" | "joined" = "connecting";
  let me: ParticipantId | null = null;
  let myVote: CardId | null = null;
  const room: RoomData = role === "host" ? hostRoom() : demoRoom();
  let state: RoomSessionState = { status: "connecting" };

  function hostRoom(): RoomData {
    const createdAt = listed?.createdAt ?? now();
    return {
      epicTitle: listed?.epicTitle ?? "Preview room",
      createdAt,
      expiresAt: listed?.expiresAt ?? roomExpiresAt(createdAt),
      participants: [],
      stories: [],
      activeStoryId: null,
      rounds: [],
      currentRound: null,
    };
  }

  /** A room already in progress, as a participant would find it. */
  function demoRoom(): RoomData {
    const createdAt = now() - 16 * 60_000;
    const participants = [DEMO_HOST, ...TEAMMATES.slice(0, 4)].map((person, index) =>
      participant(person, index === 0),
    );
    const stories: Story[] = DEMO_STORIES.map((title, index) => ({
      id: newId<StoryId>("s"),
      title,
      status: index === 0 ? "estimated" : index === 1 ? "active" : "queued",
    }));
    const active = stories[1]!;
    const round: Round = {
      storyId: active.id,
      number: 1,
      status: "voting",
      expectedVoterIds: participants.filter((p) => !p.isHost).map((p) => p.id),
      votedIds: participants.slice(1, 3).map((p) => p.id),
    };
    return {
      epicTitle: listed?.epicTitle ?? "Checkout revamp",
      createdAt,
      expiresAt: roomExpiresAt(createdAt),
      participants,
      stories,
      activeStoryId: active.id,
      rounds: [round],
      currentRound: round,
    };
  }

  function participant(profile: Profile, isHost: boolean): Participant {
    return { id: newId<ParticipantId>("p"), ...profile, isHost, online: true };
  }

  function emit(): void {
    state = snapshot();
    listeners.forEach((listener) => listener());
  }

  function snapshot(): RoomSessionState {
    const online = room.participants.filter((p) => p.online);
    if (phase === "connecting") return { status: "connecting" };
    if (phase === "lobby" || !me) {
      return {
        status: "lobby",
        lobby: {
          roomId,
          epicTitle: room.epicTitle,
          createdAt: room.createdAt,
          expiresAt: room.expiresAt,
          role,
          participants: online,
        },
      };
    }
    return {
      status: "joined",
      view: {
        roomId,
        epicTitle: room.epicTitle,
        createdAt: room.createdAt,
        expiresAt: room.expiresAt,
        status: "active",
        me,
        participants: [...room.participants],
        stories: [...room.stories],
        activeStoryId: room.activeStoryId,
        round: room.currentRound,
        myVote,
      },
    };
  }

  function schedule(delayMs: number, task: () => void): void {
    const timer = setTimeout(() => {
      timers.delete(timer);
      task();
    }, delayMs);
    timers.add(timer);
  }

  function updateRound(change: (round: Round) => Round): void {
    const round = room.currentRound;
    if (!round) return;
    const next = change(round);
    room.currentRound = next;
    room.rounds = room.rounds.map((existing) => (existing === round ? next : existing));
  }

  function recordVote(participantId: ParticipantId): void {
    updateRound((round) =>
      round.status !== "voting" || round.votedIds.includes(participantId)
        ? round
        : { ...round, votedIds: [...round.votedIds, participantId] },
    );
  }

  /** Simulated teammates vote after a short, random think. */
  function scheduleTeammateVotes(): void {
    const round = room.currentRound;
    if (!round || round.status !== "voting") return;
    for (const person of room.participants) {
      if (person.id === me || !person.online || round.votedIds.includes(person.id)) continue;
      schedule(VOTE_DELAY_MIN_MS + random() * VOTE_DELAY_SPREAD_MS, () => {
        if (room.currentRound !== null && room.currentRound.storyId === round.storyId) {
          recordVote(person.id);
          emit();
        }
      });
    }
  }

  function addTeammate(teammate: Teammate): void {
    const person = participant(teammate, false);
    room.participants = [...room.participants, person];
    // People who join during voting are expected to vote (PRD 12.4).
    updateRound((round) =>
      round.status === "voting"
        ? { ...round, expectedVoterIds: [...round.expectedVoterIds, person.id] }
        : round,
    );
    emit();
    scheduleTeammateVotes();
  }

  const isHost = () => role === "host" && me !== null;

  schedule(CONNECT_DELAY_MS, () => {
    phase = "lobby";
    emit();
  });

  return {
    getState: () => state,

    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },

    async join(profile) {
      if (phase !== "lobby") return;
      const self = participant(profile, role === "host");
      me = self.id;
      room.participants = self.isHost ? [self, ...room.participants] : [...room.participants, self];
      updateRound((round) =>
        round.status === "voting"
          ? { ...round, expectedVoterIds: [...round.expectedVoterIds, self.id] }
          : round,
      );
      phase = "joined";
      emit();

      if (role === "host") {
        TEAMMATES.forEach((teammate, index) =>
          schedule(TEAMMATE_JOIN_INTERVAL_MS * (index + 1), () => addTeammate(teammate)),
        );
      } else {
        scheduleTeammateVotes();
      }
    },

    addStory(title) {
      const valid = validateTitle(title);
      if (!isHost() || !valid.ok || room.stories.length >= LIMITS.maxStories) return;
      const story: Story = { id: newId<StoryId>("s"), title: valid.value, status: "queued" };
      room.stories = [...room.stories, story];
      if (room.activeStoryId === null) activate(story.id);
      emit();
    },

    activateStory(storyId) {
      if (!isHost() || room.currentRound?.status === "voting") return;
      activate(storyId);
      emit();
    },

    startEstimation() {
      if (!isHost() || !room.activeStoryId || room.currentRound?.status === "voting") return;
      const storyId = room.activeStoryId;
      const round: Round = {
        storyId,
        number: room.rounds.filter((existing) => existing.storyId === storyId).length + 1,
        status: "voting",
        expectedVoterIds: room.participants.filter((p) => p.online && !p.isHost).map((p) => p.id),
        votedIds: [],
      };
      room.rounds = [...room.rounds, round];
      room.currentRound = round;
      myVote = null;
      emit();
      scheduleTeammateVotes();
    },

    castVote(card) {
      if (!me || room.currentRound?.status !== "voting") return;
      myVote = card;
      recordVote(me);
      emit();
    },

    close() {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
      listeners.clear();
    },
  };

  /** Activating a story shows Discuss; the story left behind returns to the queue (PRD 12.2). */
  function activate(storyId: StoryId): void {
    const revealed = new Set(
      room.rounds.filter((round) => round.status === "revealed").map((round) => round.storyId),
    );
    room.stories = room.stories.map((story) => {
      if (story.id === storyId) return { ...story, status: "active" };
      if (story.status !== "active") return story;
      return { ...story, status: revealed.has(story.id) ? "estimated" : "queued" };
    });
    room.activeStoryId = storyId;
    room.currentRound = null;
    myVote = null;
  }
}
