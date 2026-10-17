import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Eye,
  LoaderCircle,
  Pencil,
  Play,
  Plus,
  RotateCcw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import {
  getNextStory,
  getStoryPosition,
  getVoteProgress,
  type RoomPhase,
  type Round,
  type Story,
  type StoryId,
  visibleStories,
} from "@/domain/room/room";
import { getRoundResults } from "@/domain/room/round-results";
import type { CardId } from "@/domain/rules/deck";

import { PhaseSteps } from "./phase-steps";

export interface StoryPanelProps {
  story: Story;
  stories: readonly Story[];
  round: Round | null;
  phase: RoomPhase;
  /** Host controls show only for the host of an active room. */
  canHost: boolean;
  /** An ended room shows where it stopped, with no next step (FR-022). */
  ended: boolean;
  myVote: CardId | null;
  onAddStory: () => void;
  onRenameStory: () => void;
  onActivateStory: (storyId: StoryId) => void;
  onStartRound: () => void;
  onReveal: () => void;
}

/** The current story, its place in the queue, the round phase and the host's next action. */
export function StoryPanel({
  story,
  stories,
  round,
  phase,
  canHost,
  ended,
  myVote,
  onAddStory,
  onRenameStory,
  onActivateStory,
  onStartRound,
  onReveal,
}: StoryPanelProps) {
  const position = getStoryPosition(stories, story.id);
  const queue = visibleStories(stories);
  const index = queue.findIndex((item) => item.id === story.id);
  const previous = index > 0 ? queue[index - 1] : undefined;
  const following = index === -1 ? undefined : queue[index + 1];
  const next = getNextStory(stories, story.id);
  const revealing = round?.status === "revealing";
  // A round cancelled by ending the room isn't a round anyone can act on.
  const shownRound = round?.status === "cancelled" ? null : round;

  return (
    <section
      aria-labelledby="story-title"
      className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-8"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
          {position ? `Story ${position.number} of ${position.total}` : "Story"}
          {shownRound ? ` · Round ${shownRound.number}` : null}
        </p>
        {canHost ? (
          <div className="-mr-2 flex items-center gap-1">
            {/* Icons only on phones, so the story position keeps its line. */}
            <Button variant="ghost" size="sm" onClick={onRenameStory} title="Rename">
              <Pencil aria-hidden className="size-3.5" />
              <span className="max-sm:sr-only">Rename</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={onAddStory} title="Add story">
              <Plus aria-hidden className="size-4" />
              <span className="max-sm:sr-only">Add story</span>
            </Button>
          </div>
        ) : null}
      </div>

      <h2
        id="story-title"
        className="mt-2 font-display text-2xl font-bold break-words text-primary-strong sm:text-3xl"
      >
        {story.title}
      </h2>

      {ended ? null : (
        <div className="mt-6 flex flex-col gap-4 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            {canHost ? (
              <IconButton
                label="Previous story"
                disabled={!previous || revealing}
                onClick={() => previous && onActivateStory(previous.id)}
                className="disabled:opacity-40"
              >
                <ChevronLeft aria-hidden className="size-5" />
              </IconButton>
            ) : null}
            <PhaseSteps phase={phase} />
            {canHost ? (
              <IconButton
                label="Next story in the queue"
                disabled={!following || revealing}
                onClick={() => following && onActivateStory(following.id)}
                className="disabled:opacity-40"
              >
                <ChevronRight aria-hidden className="size-5" />
              </IconButton>
            ) : null}
          </div>

          {canHost ? (
            <HostActions
              phase={phase}
              round={round}
              next={next}
              onActivateStory={onActivateStory}
              onStartRound={onStartRound}
              onReveal={onReveal}
            />
          ) : null}
        </div>
      )}

      {/* The room announcer reads changes out; this text is for reading at any time. */}
      <div className="mt-4 flex flex-col gap-1 text-sm">
        {ended ? (
          <p className="text-ink-muted">
            {round?.status === "revealed"
              ? "These results are final: the room has ended."
              : "The room ended before votes were revealed for this story."}
          </p>
        ) : (
          <StatusText phase={phase} round={round} canHost={canHost} myVote={myVote} />
        )}
      </div>
    </section>
  );
}

function HostActions({
  phase,
  round,
  next,
  onActivateStory,
  onStartRound,
  onReveal,
}: Pick<StoryPanelProps, "phase" | "round" | "onActivateStory" | "onStartRound" | "onReveal"> & {
  next: Story | null;
}) {
  const layout = "flex flex-col-reverse gap-2 sm:flex-row sm:items-center";

  if (phase === "discuss") {
    return (
      <Button onClick={onStartRound}>
        <Play aria-hidden className="size-4" />
        Start estimation
      </Button>
    );
  }

  if (phase === "estimate" && round?.status === "revealing") {
    return (
      <Button variant="accent" disabled>
        <LoaderCircle aria-hidden className="size-4 motion-safe:animate-spin" />
        Revealing…
      </Button>
    );
  }

  if (phase === "estimate" && round) {
    return (
      <div className={layout}>
        <Button variant="ghost" onClick={onStartRound}>
          <RotateCcw aria-hidden className="size-4" />
          Restart round
        </Button>
        <Button
          variant="accent"
          disabled={round.votedIds.length === 0}
          title={round.votedIds.length === 0 ? "Reveal opens once someone votes" : undefined}
          onClick={onReveal}
        >
          <Eye aria-hidden className="size-4" />
          Reveal votes
        </Button>
      </div>
    );
  }

  if (phase === "review") {
    return (
      <div className={layout}>
        <Button variant={next ? "secondary" : "primary"} onClick={onStartRound}>
          <RotateCcw aria-hidden className="size-4" />
          Start new round
        </Button>
        {next ? (
          <Button onClick={() => onActivateStory(next.id)}>
            Next story
            <ArrowRight aria-hidden className="size-4" />
          </Button>
        ) : null}
      </div>
    );
  }

  return null;
}

function StatusText({
  phase,
  round,
  canHost,
  myVote,
}: Pick<StoryPanelProps, "phase" | "round" | "canHost" | "myVote">) {
  if (phase === "discuss") {
    return (
      <p className="text-ink-muted">
        {canHost
          ? "Start estimation when the team is ready."
          : "The team is discussing. The host will start estimation."}
      </p>
    );
  }

  if (phase === "review" && round?.outcome) {
    const { displayAverage, numericCount } = getRoundResults(round.outcome);
    return (
      <p className="text-ink-muted">
        Votes are revealed.
        <span className="sr-only">
          {displayAverage
            ? ` Average ${displayAverage} from ${numericCount} numeric ${numericCount === 1 ? "vote" : "votes"}.`
            : " No numeric estimate."}
        </span>
        {canHost ? null : " The host will start a new round or move on."}
      </p>
    );
  }

  if (phase !== "estimate" || !round) return null;

  if (round.status === "revealing") {
    return <p className="font-medium text-ink">Revealing votes…</p>;
  }

  const progress = getVoteProgress(round);
  return (
    <>
      <p className="font-medium text-ink">
        {progress.voted} of {progress.expected} voted
        <span className="font-normal text-ink-muted">
          {progress.waitingOn > 0 ? ` · waiting on ${progress.waitingOn}` : " · everyone has voted"}
        </span>
      </p>
      {myVote ? (
        <p className="text-success">
          Your vote is recorded. You can change it until the host reveals.
        </p>
      ) : null}
    </>
  );
}
