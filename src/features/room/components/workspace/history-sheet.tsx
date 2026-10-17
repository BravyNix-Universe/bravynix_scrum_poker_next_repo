"use client";

import { ChevronDown, History } from "lucide-react";

import type { RoomView } from "@/application/room/room-view";
import { Avatar } from "@/components/ui/avatar";
import { Sheet } from "@/components/ui/sheet";
import { VoteCard } from "@/components/ui/vote-card";
import { displayNameOf } from "@/domain/room/profile";
import type { Round, RoundOutcome, Voter } from "@/domain/room/room";
import { getRoundResults } from "@/domain/room/round-results";
import { getCard } from "@/domain/rules/deck";

export interface HistorySheetProps {
  open: boolean;
  onClose: () => void;
  view: RoomView;
}

/**
 * Every finished round, newest first (PRD 8.3, FR-020): story, round number and average, with
 * the votes one tap away. Cancelled rounds keep their number and are never revealed (FR-041).
 */
export function HistorySheet({ open, onClose, view }: HistorySheetProps) {
  const finished = view.rounds
    .filter((round) => round.status === "revealed" || round.status === "cancelled")
    .toSorted((a, b) => (b.revealedAt ?? b.startedAt) - (a.revealedAt ?? a.startedAt));
  const revealedCount = finished.filter((round) => round.status === "revealed").length;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="History"
      description={revealedCount === 1 ? "1 revealed round" : `${revealedCount} revealed rounds`}
    >
      {finished.length === 0 ? (
        <div className="flex flex-col items-center py-10 text-center">
          <History aria-hidden className="size-8 text-ink-subtle" />
          <p className="mt-3 text-sm text-ink-muted">
            No rounds yet. Results appear here after each reveal.
          </p>
        </div>
      ) : (
        <ol className="flex flex-col gap-3">
          {finished.map((round) => (
            <HistoryEntry key={round.id} round={round} view={view} />
          ))}
        </ol>
      )}
    </Sheet>
  );
}

function HistoryEntry({ round, view }: { round: Round; view: RoomView }) {
  const story = view.stories.find((item) => item.id === round.storyId);
  const title = story?.title ?? "Deleted story";
  const isCurrent = round.id === view.round?.id;

  return (
    <li className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 font-display text-base font-bold break-words text-primary-strong">
          {title}
        </h3>
        {isCurrent ? (
          <span className="shrink-0 rounded-full bg-primary-soft px-2 py-0.5 text-2xs font-semibold text-primary">
            Current
          </span>
        ) : null}
      </div>
      {story?.status === "removed" ? (
        <p className="text-xs text-ink-subtle">Removed from the queue</p>
      ) : null}

      {round.status === "cancelled" || !round.outcome ? (
        <p className="mt-1 text-sm text-ink-muted">Round {round.number}: cancelled, not revealed</p>
      ) : (
        <RevealedRound number={round.number} outcome={round.outcome} />
      )}
    </li>
  );
}

function RevealedRound({ number, outcome }: { number: number; outcome: RoundOutcome }) {
  const results = getRoundResults(outcome);
  const counts = [
    `${results.numericCount} numeric`,
    results.unsureCount > 0 ? `${results.unsureCount} ?` : null,
    results.notVotedCount > 0 ? `${results.notVotedCount} not voted` : null,
    results.notRevealedCount > 0 ? `${results.notRevealedCount} not revealed` : null,
  ].filter(Boolean);

  return (
    <>
      <p className="mt-1 text-sm text-ink">
        Round {number} ·{" "}
        <span className="font-semibold">
          {results.displayAverage ? `Average ${results.displayAverage}` : "No numeric estimate"}
        </span>
      </p>
      <p className="text-xs text-ink-muted">{counts.join(" · ")}</p>

      <details className="group mt-3">
        <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-semibold text-primary">
          <ChevronDown
            aria-hidden
            className="size-4 -rotate-90 transition-transform group-open:rotate-0 motion-reduce:transition-none"
          />
          Votes
        </summary>
        <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {outcome.votes.map((vote) => (
            <li
              key={vote.participantId}
              className="flex items-center gap-2 rounded-lg bg-canvas-sunken px-2 py-1.5"
            >
              <Avatar avatarId={vote.avatarId} size="xs" />
              <span className="min-w-0 flex-1 truncate text-sm text-ink">
                {displayNameOf(vote)}
              </span>
              <VoteCard
                card={vote.card}
                className="h-7 w-6 items-center justify-center p-0 [&>span]:text-xs [&>span:last-child]:hidden"
              />
              <span className="sr-only">voted {getCard(vote.card).label}</span>
            </li>
          ))}
        </ul>
        <AbsentList label="Not voted" voters={outcome.notVoted} />
        <AbsentList label="Not revealed" voters={outcome.notRevealed} />
      </details>
    </>
  );
}

function AbsentList({ label, voters }: { label: string; voters: readonly Voter[] }) {
  if (voters.length === 0) return null;
  return (
    <p className="mt-2 text-xs text-ink-muted">
      <span className="font-semibold">{label}:</span> {voters.map(displayNameOf).join(", ")}
    </p>
  );
}
