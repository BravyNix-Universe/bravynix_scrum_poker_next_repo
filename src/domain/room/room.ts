import type { CardId } from "@/domain/rules/deck";
import type { Countdown } from "@/domain/rules/timer";

import type { Profile } from "./profile";

/**
 * The room model every device shares (PRD 12, SDD section 10). Vote values are deliberately
 * absent until a round is revealed: before that, devices only learn who has voted (FR-013).
 */
export type ParticipantId = string & { readonly __brand: "ParticipantId" };
export type StoryId = string & { readonly __brand: "StoryId" };
export type RoundId = string & { readonly __brand: "RoundId" };

export type RoomStatus = "active" | "ended";
export type StoryStatus = "queued" | "active" | "estimated" | "removed";
export type RoundStatus = "voting" | "revealing" | "revealed" | "cancelled";

export interface Participant extends Profile {
  id: ParticipantId;
  isHost: boolean;
  online: boolean;
}

export interface Story {
  id: StoryId;
  title: string;
  status: StoryStatus;
}

/** A person as they appeared when a round was revealed; later name changes don't alter it (FR-049). */
export interface Voter extends Profile {
  participantId: ParticipantId;
}

export interface RevealedVote extends Voter {
  card: CardId;
}

/** What a revealed round recorded (PRD 11.5, FR-020). */
export interface RoundOutcome {
  /** Valid openings, in roster order. */
  votes: readonly RevealedVote[];
  /** Expected voters with no vote when the host revealed. */
  notVoted: readonly Voter[];
  /** Voted, but no valid opening arrived before the reveal deadline. */
  notRevealed: readonly Voter[];
}

export interface Round {
  id: RoundId;
  storyId: StoryId;
  /** 1-based per story; cancelled rounds keep their number (PRD D-10). */
  number: number;
  status: RoundStatus;
  startedAt: number;
  /** People expected to vote, excluding the host unless they vote (PRD 12.4). */
  expectedVoterIds: readonly ParticipantId[];
  votedIds: readonly ParticipantId[];
  revealedAt: number | null;
  /** Set once the round is revealed. */
  outcome: RoundOutcome | null;
}

/** A running countdown, set by the host (PRD 12.5). It never reveals or closes voting. */
export type RoomTimer = Countdown;

/**
 * Discuss = an active story with no open round; Estimate = VOTING or REVEALING;
 * Review = REVEALED (PRD 8.3). "no-story" covers an empty room and one with no active story.
 */
export type RoomPhase = "no-story" | "discuss" | "estimate" | "review";

export function getRoomPhase(activeStory: Story | null, round: Round | null): RoomPhase {
  if (!activeStory) return "no-story";
  if (!round || round.status === "cancelled") return "discuss";
  if (round.status === "revealed") return "review";
  return "estimate";
}

/** Stories in queue order, without removed ones. */
export function visibleStories(stories: readonly Story[]): Story[] {
  return stories.filter((story) => story.status !== "removed");
}

export interface StoryPosition {
  /** 1-based. */
  number: number;
  total: number;
}

/** "Story 3 of 5" among the visible stories, or null when the story isn't among them. */
export function getStoryPosition(
  stories: readonly Story[],
  storyId: StoryId,
): StoryPosition | null {
  const visible = visibleStories(stories);
  const index = visible.findIndex((story) => story.id === storyId);
  return index === -1 ? null : { number: index + 1, total: visible.length };
}

/** The visible story after `storyId`, preferring one that hasn't been estimated yet. */
export function getNextStory(stories: readonly Story[], storyId: StoryId): Story | null {
  const visible = visibleStories(stories);
  const after = visible.slice(visible.findIndex((story) => story.id === storyId) + 1);
  return after.find((story) => story.status === "queued") ?? after[0] ?? null;
}

/** Rounds of one story, oldest first. */
export function storyRounds(rounds: readonly Round[], storyId: StoryId): Round[] {
  return rounds.filter((round) => round.storyId === storyId);
}

/** The story's most recent revealed round, which gives its estimate in the queue. */
export function latestRevealedRound(rounds: readonly Round[], storyId: StoryId): Round | null {
  return storyRounds(rounds, storyId).findLast((round) => round.status === "revealed") ?? null;
}

/** A story with rounds can only be removed, never deleted (PRD FR-032, FR-039). */
export function canDeleteStory(rounds: readonly Round[], storyId: StoryId): boolean {
  return !rounds.some((round) => round.storyId === storyId);
}

export interface VoteProgress {
  voted: number;
  expected: number;
  waitingOn: number;
}

/** Counts use expected voters only; the host counts once they vote (PRD 12.4). */
export function getVoteProgress(round: Round): VoteProgress {
  const expected = new Set([...round.expectedVoterIds, ...round.votedIds]).size;
  const voted = round.votedIds.length;
  return { voted, expected, waitingOn: expected - voted };
}

/** Expected voters who haven't voted yet, for the early-reveal warning (PRD A-01). */
export function getWaitingVoterIds(round: Round): ParticipantId[] {
  return round.expectedVoterIds.filter((id) => !round.votedIds.includes(id));
}

export function hasVoted(round: Round | null, participantId: ParticipantId): boolean {
  return round?.votedIds.includes(participantId) ?? false;
}

/** Whether the round waits on this person: everyone expected, plus the host once they vote. */
export function isExpectedVoter(round: Round | null, participantId: ParticipantId): boolean {
  if (!round) return false;
  return round.expectedVoterIds.includes(participantId) || round.votedIds.includes(participantId);
}
