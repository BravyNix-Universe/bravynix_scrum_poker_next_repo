import { ChevronLeft, ChevronRight, Eye, Play, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import {
  getStoryPosition,
  getVoteProgress,
  type RoomPhase,
  type Round,
  type Story,
  type StoryId,
  visibleStories,
} from "@/domain/room/room";
import type { CardId } from "@/domain/rules/deck";

import { PhaseSteps } from "./phase-steps";

export interface StoryPanelProps {
  story: Story;
  stories: readonly Story[];
  round: Round | null;
  phase: RoomPhase;
  isHost: boolean;
  myVote: CardId | null;
  onAddStory: () => void;
  onActivateStory: (storyId: StoryId) => void;
  onStartEstimation: () => void;
}

/** The current story, its place in the queue, the round phase and the host's next action. */
export function StoryPanel({
  story,
  stories,
  round,
  phase,
  isHost,
  myVote,
  onAddStory,
  onActivateStory,
  onStartEstimation,
}: StoryPanelProps) {
  const position = getStoryPosition(stories, story.id);
  const queue = visibleStories(stories);
  const index = queue.findIndex((item) => item.id === story.id);
  const previous = index > 0 ? queue[index - 1] : undefined;
  const next = queue[index + 1];
  // Switching story mid-vote needs the cancel confirmation that arrives with Phase 3 (FR-041).
  const canSwitch = round?.status !== "voting";

  return (
    <section
      aria-labelledby="story-title"
      className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-8"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
          {position ? `Story ${position.number} of ${position.total}` : "Story"}
          {round ? ` · Round ${round.number}` : null}
        </p>
        {isHost ? (
          <Button variant="ghost" size="sm" onClick={onAddStory}>
            <Plus aria-hidden className="size-4" />
            Add story
          </Button>
        ) : null}
      </div>

      <h2
        id="story-title"
        className="mt-2 font-display text-2xl font-bold break-words text-primary-strong sm:text-3xl"
      >
        {story.title}
      </h2>

      <div className="mt-6 flex flex-col gap-4 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {isHost ? (
            <IconButton
              label="Previous story"
              disabled={!previous || !canSwitch}
              onClick={() => previous && onActivateStory(previous.id)}
              className="disabled:opacity-40"
            >
              <ChevronLeft aria-hidden className="size-5" />
            </IconButton>
          ) : null}
          <PhaseSteps phase={phase} />
          {isHost ? (
            <IconButton
              label="Next story"
              disabled={!next || !canSwitch}
              onClick={() => next && onActivateStory(next.id)}
              className="disabled:opacity-40"
            >
              <ChevronRight aria-hidden className="size-5" />
            </IconButton>
          ) : null}
        </div>

        {isHost && phase === "discuss" ? (
          <Button onClick={onStartEstimation}>
            <Play aria-hidden className="size-4" />
            Start estimation
          </Button>
        ) : null}
        {isHost && phase === "estimate" ? (
          <Button variant="accent" disabled>
            <Eye aria-hidden className="size-4" />
            Reveal votes
          </Button>
        ) : null}
      </div>

      <div aria-live="polite" className="mt-4 flex flex-col gap-1 text-sm">
        <StatusText phase={phase} round={round} isHost={isHost} myVote={myVote} />
      </div>
    </section>
  );
}

function StatusText({
  phase,
  round,
  isHost,
  myVote,
}: Pick<StoryPanelProps, "phase" | "round" | "isHost" | "myVote">) {
  if (phase === "discuss") {
    return (
      <p className="text-ink-muted">
        {isHost
          ? "Start estimation when the team is ready."
          : "The team is discussing. The host will start estimation."}
      </p>
    );
  }
  if (phase !== "estimate" || !round) return null;

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
