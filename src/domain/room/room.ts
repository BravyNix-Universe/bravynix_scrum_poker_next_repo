import type { Profile } from "./profile";

/**
 * The room model every device shares (PRD 12, SDD section 10). Vote values are deliberately
 * absent: before reveal, devices only learn who has voted (PRD FR-013).
 */
export type ParticipantId = string & { readonly __brand: "ParticipantId" };
export type StoryId = string & { readonly __brand: "StoryId" };

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

export interface Round {
  storyId: StoryId;
  /** 1-based per story; cancelled rounds keep their number (PRD D-10). */
  number: number;
  status: RoundStatus;
  /** People expected to vote, excluding the host unless they vote (PRD 12.4). */
  expectedVoterIds: readonly ParticipantId[];
  votedIds: readonly ParticipantId[];
}

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

export function hasVoted(round: Round | null, participantId: ParticipantId): boolean {
  return round?.votedIds.includes(participantId) ?? false;
}

/** Whether the round waits on this person: everyone expected, plus the host once they vote. */
export function isExpectedVoter(round: Round | null, participantId: ParticipantId): boolean {
  if (!round) return false;
  return round.expectedVoterIds.includes(participantId) || round.votedIds.includes(participantId);
}
