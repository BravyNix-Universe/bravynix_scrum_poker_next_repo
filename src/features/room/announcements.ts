import type { ConnectionStatus } from "@/application/room/room-session-state";
import type { RoomView } from "@/application/room/room-view";
import {
  getVoteProgress,
  type RoundId,
  type RoundOutcome,
  type RoundStatus,
  type StoryId,
} from "@/domain/room/room";
import { getRoundResults } from "@/domain/room/round-results";
import type { CardId } from "@/domain/rules/deck";

/** The parts of a room that screen readers hear about when they change (PRD 8.6). */
export interface AnnouncedRoom {
  connection: ConnectionStatus;
  ended: boolean;
  storyId: StoryId | null;
  storyTitle: string | null;
  roundId: RoundId | null;
  roundNumber: number | null;
  roundStatus: RoundStatus | null;
  /** The revealed result in words, once there is one. */
  result: string | null;
  /** This person's vote once the host has it, so "recorded" is never said too early. */
  myVote: CardId | null;
}

export function toAnnouncedRoom(view: RoomView, connection: ConnectionStatus): AnnouncedRoom {
  const story = view.stories.find((item) => item.id === view.activeStoryId) ?? null;
  const round = view.round;
  return {
    connection,
    ended: view.status === "ended",
    storyId: story?.id ?? null,
    storyTitle: story?.title ?? null,
    roundId: round?.id ?? null,
    roundNumber: round?.number ?? null,
    roundStatus: round?.status ?? null,
    result: round?.outcome ? describeResult(round.outcome) : null,
    myVote: round?.votedIds.includes(view.me) ? view.myVote : null,
  };
}

export function isSameAnnouncedRoom(a: AnnouncedRoom, b: AnnouncedRoom): boolean {
  return (Object.keys(a) as (keyof AnnouncedRoom)[]).every((key) => a[key] === b[key]);
}

function describeResult(outcome: RoundOutcome): string {
  const { displayAverage, numericCount, unsureCount, notVotedCount, notRevealedCount } =
    getRoundResults(outcome);
  const parts = [
    displayAverage
      ? `Average ${displayAverage} from ${count(numericCount, "numeric vote")}.`
      : "No numeric estimate.",
  ];
  if (unsureCount > 0) parts.push(`${count(unsureCount, "question mark vote")}.`);
  if (notVotedCount > 0) parts.push(`${notVotedCount} didn't vote.`);
  if (notRevealedCount > 0) parts.push(`${notRevealedCount} not revealed.`);
  return parts.join(" ");
}

function count(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

/**
 * What changed between two moments of the room, in words, or null when nothing worth hearing
 * did. Vote counts are left out: they're batched separately so a busy room doesn't flood
 * screen readers (see `describeVoteProgress`).
 */
export function describeRoomChange(before: AnnouncedRoom, after: AnnouncedRoom): string | null {
  const parts: string[] = [];

  if (before.connection !== after.connection) {
    if (before.connection === "reconnecting" && after.connection !== "reconnecting") {
      parts.push("Reconnected.");
    }
    if (after.connection === "reconnecting") {
      parts.push("Connection lost. Reconnecting. Your vote isn't recorded yet.");
    } else if (after.connection === "host-away") {
      parts.push("The host is away. Voting is paused.");
    } else if (before.connection === "host-away") {
      parts.push("The host is back. Voting has resumed.");
    }
  }

  if (!before.ended && after.ended) {
    parts.push("The host ended the room. It's read-only now.");
    return parts.join(" ");
  }

  if (after.storyId !== null && before.storyId !== after.storyId) {
    parts.push(`Now on story: ${after.storyTitle}.`);
  }

  const sameRound = before.roundId !== null && before.roundId === after.roundId;
  if (!sameRound && after.roundStatus === "voting") {
    parts.push(`Estimation started, round ${after.roundNumber}. Pick a card.`);
  } else if (sameRound && before.roundStatus !== after.roundStatus) {
    if (after.roundStatus === "revealing") parts.push("Voting has closed. Revealing votes.");
    if (after.roundStatus === "revealed")
      parts.push(`Votes revealed. ${after.result ?? ""}`.trim());
    if (after.roundStatus === "cancelled") parts.push(`Round ${after.roundNumber} was cancelled.`);
  } else if (
    sameRound &&
    after.roundStatus === "voting" &&
    after.myVote !== null &&
    before.myVote !== after.myVote
  ) {
    parts.push("Your vote is recorded.");
  }

  return parts.length > 0 ? parts.join(" ") : null;
}

/** "3 of 5 voted." while a round is open and someone has voted; otherwise nothing. */
export function describeVoteProgress(view: RoomView): string {
  if (view.round?.status !== "voting") return "";
  const { voted, expected } = getVoteProgress(view.round);
  if (voted === 0) return "";
  return voted === expected
    ? `Everyone has voted: ${voted} of ${expected}.`
    : `${voted} of ${expected} voted.`;
}
