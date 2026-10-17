import { isAvatarId } from "@/domain/avatars/avatars";
import { type Profile, validateDisplayName } from "@/domain/room/profile";
import {
  canDeleteStory,
  latestRevealedRound,
  type Participant,
  type ParticipantId,
  type Round,
  type RoundId,
  type RoundOutcome,
  type Story,
  type StoryId,
  type Voter,
  visibleStories,
} from "@/domain/room/room";
import { isCardId } from "@/domain/rules/deck";
import { LIMITS } from "@/domain/rules/limits";
import { validateTitle } from "@/domain/rules/text";
import { isValidTimerDuration } from "@/domain/rules/timer";

import type { Refusal, RoomCommand } from "./room-command";
import { getCurrentRound, getHost, type RoomState } from "./room-state";

export interface RefereeContext {
  now: number;
  /** A fresh, unique ID for a new story or round. */
  newId: () => string;
}

export type RefereeResult = { ok: true; state: RoomState } | { ok: false; refusal: Refusal };

const HOST_ONLY: ReadonlySet<RoomCommand["type"]> = new Set([
  "add-story",
  "rename-story",
  "move-story",
  "remove-story",
  "restore-story",
  "delete-story",
  "activate-story",
  "start-round",
  "reveal",
  "finish-reveal",
  "start-timer",
  "stop-timer",
  "end-room",
]);

/** Commands an ended room still accepts: it stays viewable, read-only (PRD FR-022, Q-11). */
const ALLOWED_WHEN_ENDED: ReadonlySet<RoomCommand["type"]> = new Set(["join", "set-online"]);

/**
 * The room referee (SDD 9): the single authority for stories, rounds, votes, reveal, timer and
 * room state. A pure function of the current state and one command, so the host's browser can
 * run it today and a server could run it later without change (ADR-09).
 */
export function applyCommand(
  state: RoomState,
  actorId: ParticipantId,
  command: RoomCommand,
  context: RefereeContext,
): RefereeResult {
  if (command.type === "join") return join(state, actorId, command.profile, command.asHost);

  const actor = state.participants.find((person) => person.id === actorId);
  if (!actor) return refuse("not-in-room");
  if (HOST_ONLY.has(command.type) && !actor.isHost) return refuse("not-host");
  if (state.status === "ended" && !ALLOWED_WHEN_ENDED.has(command.type)) {
    return refuse("room-ended");
  }

  switch (command.type) {
    case "set-online":
      return accept(updateParticipant(state, actorId, { online: command.online }));
    case "update-profile":
      return isValidProfile(command.profile)
        ? accept(updateParticipant(state, actorId, command.profile))
        : refuse("invalid-profile");
    case "add-story":
      return addStory(state, command.title, context);
    case "rename-story":
      return renameStory(state, command.storyId, command.title);
    case "move-story":
      return moveStory(state, command.storyId, command.toIndex);
    case "remove-story":
      return removeStory(state, command.storyId);
    case "restore-story":
      return restoreStory(state, command.storyId);
    case "delete-story":
      return deleteStory(state, command.storyId);
    case "activate-story":
      return activateStory(state, command.storyId);
    case "start-round":
      return startRound(state, context);
    case "cast-vote":
      return castVote(state, actor, command.seal);
    case "reveal":
      return reveal(state);
    case "open-vote":
      return openVote(state, actorId, command);
    case "finish-reveal":
      return finishReveal(state, context);
    case "start-timer":
      return isValidTimerDuration(command.durationMs)
        ? accept({
            ...state,
            timer: { durationMs: command.durationMs, endsAt: context.now + command.durationMs },
          })
        : refuse("invalid-timer");
    case "stop-timer":
      return accept({ ...state, timer: null });
    case "end-room":
      return endRoom(state, context);
  }
}

/** True once every sealed vote in a REVEALING round has been opened. */
export function isRevealComplete(state: RoomState): boolean {
  const round = getCurrentRound(state);
  return (
    round?.status === "revealing" &&
    round.votedIds.every((id) => state.openings.some((opening) => opening.participantId === id))
  );
}

function accept(state: RoomState): RefereeResult {
  return { ok: true, state };
}

function refuse(refusal: Refusal): RefereeResult {
  return { ok: false, refusal };
}

// --- People ---------------------------------------------------------------------------------

function join(
  state: RoomState,
  actorId: ParticipantId,
  profile: Profile,
  asHost: boolean,
): RefereeResult {
  if (!isValidProfile(profile)) return refuse("invalid-profile");
  const host = getHost(state);
  if (asHost && host && host.id !== actorId) return refuse("not-host");

  const existing = state.participants.find((person) => person.id === actorId);
  const online = state.participants.filter((person) => person.online && person.id !== actorId);
  if (online.length >= LIMITS.maxParticipants) return refuse("room-full");

  const participants = existing
    ? state.participants.map((person) =>
        person.id === actorId ? { ...person, ...profile, online: true } : person,
      )
    : addParticipant(state.participants, { id: actorId, ...profile, isHost: asHost, online: true });

  // Anyone who joins while a round is VOTING is expected to vote, except the host (PRD 12.4).
  const isHost = existing?.isHost ?? asHost;
  return accept(
    updateCurrentRound({ ...state, participants }, (round) =>
      round.status === "voting" && !isHost && !round.expectedVoterIds.includes(actorId)
        ? { ...round, expectedVoterIds: [...round.expectedVoterIds, actorId] }
        : round,
    ),
  );
}

function addParticipant(
  participants: readonly Participant[],
  person: Participant,
): readonly Participant[] {
  return person.isHost ? [person, ...participants] : [...participants, person];
}

function updateParticipant(
  state: RoomState,
  participantId: ParticipantId,
  change: Partial<Participant>,
): RoomState {
  return {
    ...state,
    participants: state.participants.map((person) =>
      person.id === participantId ? { ...person, ...change } : person,
    ),
  };
}

function isValidProfile(profile: Profile): boolean {
  if (profile.avatarId !== null && !isAvatarId(profile.avatarId)) return false;
  if (profile.displayName === null) return true;
  const name = validateDisplayName(profile.displayName);
  return name.ok && name.value === profile.displayName;
}

// --- Stories --------------------------------------------------------------------------------

function findStory(state: RoomState, storyId: StoryId): Story | null {
  return state.stories.find((story) => story.id === storyId) ?? null;
}

function setStoryStatus(state: RoomState, storyId: StoryId, status: Story["status"]): RoomState {
  return {
    ...state,
    stories: state.stories.map((story) => (story.id === storyId ? { ...story, status } : story)),
  };
}

/** A story left behind is ESTIMATED if it has a revealed round, otherwise QUEUED (PRD 12.2). */
function restingStatus(state: RoomState, storyId: StoryId): Story["status"] {
  return latestRevealedRound(state.rounds, storyId) ? "estimated" : "queued";
}

function addStory(state: RoomState, rawTitle: string, context: RefereeContext): RefereeResult {
  const title = validateTitle(rawTitle);
  if (!title.ok) return refuse("invalid-title");
  if (state.stories.length >= LIMITS.maxStories) return refuse("story-limit");

  const story: Story = { id: context.newId() as StoryId, title: title.value, status: "queued" };
  const next = { ...state, stories: [...state.stories, story] };
  // The first story in an empty queue becomes active, so the host can start straight away.
  return visibleStories(next.stories).length === 1 && !state.activeStoryId
    ? activateStory(next, story.id)
    : accept(next);
}

function renameStory(state: RoomState, storyId: StoryId, rawTitle: string): RefereeResult {
  const story = findStory(state, storyId);
  if (!story || story.status === "removed") return refuse("unknown-story");
  const title = validateTitle(rawTitle);
  if (!title.ok) return refuse("invalid-title");
  return accept({
    ...state,
    stories: state.stories.map((item) =>
      item.id === storyId ? { ...item, title: title.value } : item,
    ),
  });
}

/** Moves a visible story to `toIndex` among the visible stories (PRD FR-009). */
function moveStory(state: RoomState, storyId: StoryId, toIndex: number): RefereeResult {
  const visible = visibleStories(state.stories);
  const from = visible.findIndex((story) => story.id === storyId);
  if (from === -1) return refuse("unknown-story");
  if (!Number.isInteger(toIndex) || toIndex < 0 || toIndex >= visible.length) {
    return refuse("unknown-story");
  }
  if (from === toIndex) return accept(state);

  const moving = visible[from]!;
  const without = state.stories.filter((story) => story.id !== storyId);
  const anchor = visible.filter((story) => story.id !== storyId)[toIndex];
  const at = anchor ? without.findIndex((story) => story.id === anchor.id) : without.length;
  return accept({ ...state, stories: [...without.slice(0, at), moving, ...without.slice(at)] });
}

function removeStory(state: RoomState, storyId: StoryId): RefereeResult {
  const story = findStory(state, storyId);
  if (!story || story.status === "removed") return refuse("unknown-story");

  if (story.status !== "active") return accept(setStoryStatus(state, storyId, "removed"));

  const round = getCurrentRound(state);
  if (round?.status === "voting") return refuse("story-in-vote");
  if (round?.status === "revealing") return refuse("reveal-in-progress");
  return accept({
    ...setStoryStatus(state, storyId, "removed"),
    activeStoryId: null,
    currentRoundId: null,
    timer: null,
  });
}

function restoreStory(state: RoomState, storyId: StoryId): RefereeResult {
  const story = findStory(state, storyId);
  if (story?.status !== "removed") return refuse("unknown-story");
  return accept(setStoryStatus(state, storyId, restingStatus(state, storyId)));
}

function deleteStory(state: RoomState, storyId: StoryId): RefereeResult {
  if (!findStory(state, storyId)) return refuse("unknown-story");
  if (!canDeleteStory(state.rounds, storyId)) return refuse("story-has-rounds");
  const wasActive = state.activeStoryId === storyId;
  return accept({
    ...state,
    stories: state.stories.filter((story) => story.id !== storyId),
    activeStoryId: wasActive ? null : state.activeStoryId,
    timer: wasActive ? null : state.timer,
  });
}

/** Activating a story shows Discuss; a VOTING round is cancelled (PRD 9.5, FR-040, FR-041). */
function activateStory(state: RoomState, storyId: StoryId): RefereeResult {
  const story = findStory(state, storyId);
  if (!story || story.status === "removed") return refuse("unknown-story");
  if (getCurrentRound(state)?.status === "revealing") return refuse("reveal-in-progress");
  if (state.activeStoryId === storyId) return accept(state);

  const left = state.activeStoryId;
  let next = cancelVotingRound(state);
  if (left) next = setStoryStatus(next, left, restingStatus(next, left));
  next = setStoryStatus(next, storyId, "active");
  return accept({ ...next, activeStoryId: storyId, currentRoundId: null, timer: null });
}

// --- Rounds ---------------------------------------------------------------------------------

function updateCurrentRound(state: RoomState, change: (round: Round) => Round): RoomState {
  return {
    ...state,
    rounds: state.rounds.map((round) =>
      round.id === state.currentRoundId ? change(round) : round,
    ),
  };
}

/** A cancelled round's votes are discarded and never revealed; it keeps its number (FR-041). */
function cancelVotingRound(state: RoomState): RoomState {
  if (getCurrentRound(state)?.status !== "voting") return state;
  return {
    ...updateCurrentRound(state, (round) => ({ ...round, status: "cancelled", votedIds: [] })),
    seals: [],
  };
}

/** Opens the first or next round for the active story (PRD 9.4, FR-021). */
function startRound(state: RoomState, context: RefereeContext): RefereeResult {
  const storyId = state.activeStoryId;
  if (!storyId) return refuse("no-active-story");
  if (getCurrentRound(state)?.status === "revealing") return refuse("reveal-in-progress");

  const next = cancelVotingRound(state);
  const round: Round = {
    id: context.newId() as RoundId,
    storyId,
    number: next.rounds.filter((existing) => existing.storyId === storyId).length + 1,
    status: "voting",
    startedAt: context.now,
    // Expected voters: everyone online when the round opens, except the host (PRD 12.4).
    expectedVoterIds: next.participants
      .filter((person) => person.online && !person.isHost)
      .map((person) => person.id),
    votedIds: [],
    revealedAt: null,
    outcome: null,
  };
  return accept({
    ...next,
    rounds: [...next.rounds, round],
    currentRoundId: round.id,
    timer: null,
    seals: [],
    openings: [],
  });
}

/** Records the actor's sealed vote; changing it replaces the seal, keeping one entry (FR-012). */
function castVote(state: RoomState, actor: Participant, seal: string): RefereeResult {
  const round = getCurrentRound(state);
  if (round?.status !== "voting") return refuse("round-closed");
  if (!isSeal(seal)) return refuse("invalid-card");

  const seals = [
    ...state.seals.filter((item) => item.participantId !== actor.id),
    { participantId: actor.id, seal },
  ];
  if (round.votedIds.includes(actor.id)) return accept({ ...state, seals });
  return accept({
    ...updateCurrentRound(state, (current) => ({
      ...current,
      votedIds: [...current.votedIds, actor.id],
    })),
    seals,
  });
}

/** Seals are SHA-256 digests in base64url; anything else can't be a seal. */
function isSeal(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 128;
}

/** From this moment no new or changed votes are accepted, and the timer stops (FR-015, 12.5). */
function reveal(state: RoomState): RefereeResult {
  const round = getCurrentRound(state);
  if (round?.status !== "voting") return refuse("round-closed");
  if (round.votedIds.length === 0) return refuse("no-votes");
  return accept({
    ...updateCurrentRound(state, (current) => ({ ...current, status: "revealing" })),
    timer: null,
    openings: [],
  });
}

function openVote(
  state: RoomState,
  actorId: ParticipantId,
  command: Extract<RoomCommand, { type: "open-vote" }>,
): RefereeResult {
  const round = getCurrentRound(state);
  if (round?.status !== "revealing" || !round.votedIds.includes(actorId)) {
    return refuse("round-closed");
  }
  if (!isCardId(command.card)) return refuse("invalid-card");
  if (state.openings.some((opening) => opening.participantId === actorId)) return accept(state);
  const sealed = state.seals.find((item) => item.participantId === actorId);
  if (sealed?.seal !== command.fingerprint) return refuse("seal-mismatch");
  return accept({
    ...state,
    openings: [...state.openings, { participantId: actorId, card: command.card }],
  });
}

/** Locks the round: valid openings become votes, the rest "not revealed" (PRD 9.3, 11.5). */
function finishReveal(state: RoomState, context: RefereeContext): RefereeResult {
  const round = getCurrentRound(state);
  if (round?.status !== "revealing") return refuse("round-closed");

  const voter = (person: Participant): Voter => ({
    participantId: person.id,
    displayName: person.displayName,
    avatarId: person.avatarId,
  });
  const cardOf = (id: ParticipantId) =>
    state.openings.find((opening) => opening.participantId === id)?.card;

  const outcome: RoundOutcome = {
    votes: state.participants.flatMap((person) => {
      const card = round.votedIds.includes(person.id) ? cardOf(person.id) : undefined;
      return card ? [{ ...voter(person), card }] : [];
    }),
    notVoted: state.participants
      .filter((p) => round.expectedVoterIds.includes(p.id) && !round.votedIds.includes(p.id))
      .map(voter),
    notRevealed: state.participants
      .filter((p) => round.votedIds.includes(p.id) && !cardOf(p.id))
      .map(voter),
  };

  return accept({
    ...updateCurrentRound(state, (current) => ({
      ...current,
      status: "revealed",
      revealedAt: context.now,
      outcome,
    })),
    seals: [],
    openings: [],
  });
}

/** The room becomes read-only; a VOTING round is cancelled (PRD 9.6, FR-022). */
function endRoom(state: RoomState, context: RefereeContext): RefereeResult {
  if (getCurrentRound(state)?.status === "revealing") return refuse("reveal-in-progress");
  return accept({
    ...cancelVotingRound(state),
    status: "ended",
    endedAt: context.now,
    timer: null,
  });
}
