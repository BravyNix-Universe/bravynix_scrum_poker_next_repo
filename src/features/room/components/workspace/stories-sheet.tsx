"use client";

import {
  Archive,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Pencil,
  Play,
  Trash2,
  Undo2,
} from "lucide-react";
import { useState } from "react";

import type { RoomView } from "@/application/room/room-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Sheet } from "@/components/ui/sheet";
import {
  canDeleteStory,
  latestRevealedRound,
  type Story,
  type StoryId,
  visibleStories,
} from "@/domain/room/room";
import { getRoundResults } from "@/domain/room/round-results";
import { LIMITS } from "@/domain/rules/limits";
import { cn } from "@/lib/cn";

import { StoryTitleForm } from "./story-title-form";

export interface StoriesSheetProps {
  open: boolean;
  onClose: () => void;
  view: RoomView;
  canHost: boolean;
  onAddStory: (title: string) => void;
  onActivateStory: (storyId: StoryId) => void;
  onRenameStory: (storyId: StoryId) => void;
  onMoveStory: (storyId: StoryId, toIndex: number) => void;
  onRemoveStory: (storyId: StoryId) => void;
  onRestoreStory: (storyId: StoryId) => void;
  onDeleteStory: (storyId: StoryId) => void;
}

/**
 * The story queue (PRD FR-008, FR-009, FR-032, FR-038, FR-039). Everyone can read it; the host
 * can add, reorder, rename, activate, remove and restore stories.
 */
export function StoriesSheet({ open, onClose, view, canHost, ...actions }: StoriesSheetProps) {
  const [expandedId, setExpandedId] = useState<StoryId | null>(null);
  const queue = visibleStories(view.stories);
  const removed = view.stories.filter((story) => story.status === "removed");
  const estimated = queue.filter((story) => latestRevealedRound(view.rounds, story.id)).length;
  const atLimit = view.stories.length >= LIMITS.maxStories;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      side="left"
      title="Stories"
      description={`${queue.length} ${queue.length === 1 ? "story" : "stories"} in the queue`}
      footer={
        queue.length > 0 ? (
          <div>
            <div className="flex justify-between text-xs text-ink-muted">
              <span>Progress</span>
              <span>
                {estimated} of {queue.length} estimated
              </span>
            </div>
            <div
              role="progressbar"
              aria-label="Stories estimated"
              aria-valuemin={0}
              aria-valuemax={queue.length}
              aria-valuenow={estimated}
              className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted"
            >
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${(estimated / queue.length) * 100}%` }}
              />
            </div>
          </div>
        ) : null
      }
    >
      {canHost ? (
        atLimit ? (
          <p className="mb-5 rounded-lg bg-accent-soft p-3 text-sm text-accent-ink">
            This room has reached its limit of {LIMITS.maxStories} stories.
          </p>
        ) : (
          <StoryTitleForm onSubmit={actions.onAddStory} className="mb-5" />
        )
      ) : null}

      {queue.length === 0 ? (
        <p className="text-sm text-ink-muted">No stories yet.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {queue.map((story, index) => (
            <StoryRow
              key={story.id}
              story={story}
              index={index}
              total={queue.length}
              view={view}
              canHost={canHost}
              expanded={expandedId === story.id}
              onToggle={() => setExpandedId(expandedId === story.id ? null : story.id)}
              onActivate={() => {
                onClose();
                actions.onActivateStory(story.id);
              }}
              onRename={() => actions.onRenameStory(story.id)}
              onMove={(toIndex) => actions.onMoveStory(story.id, toIndex)}
              onRemove={() => actions.onRemoveStory(story.id)}
              onDelete={() => actions.onDeleteStory(story.id)}
            />
          ))}
        </ol>
      )}

      {removed.length > 0 ? (
        <details className="group mt-6">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-sm font-semibold text-ink-muted">
            <ChevronDown
              aria-hidden
              className="size-4 -rotate-90 transition-transform group-open:rotate-0 motion-reduce:transition-none"
            />
            Removed ({removed.length})
          </summary>
          <ul className="mt-2 flex flex-col gap-2">
            {removed.map((story) => (
              <li
                key={story.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-line p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm break-words text-ink-muted">{story.title}</p>
                  <p className="text-xs text-ink-subtle">History is kept</p>
                </div>
                {canHost ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => actions.onRestoreStory(story.id)}
                  >
                    <Undo2 aria-hidden className="size-3.5" />
                    Restore
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </Sheet>
  );
}

interface StoryRowProps {
  story: Story;
  index: number;
  total: number;
  view: RoomView;
  canHost: boolean;
  expanded: boolean;
  onToggle: () => void;
  onActivate: () => void;
  onRename: () => void;
  onMove: (toIndex: number) => void;
  onRemove: () => void;
  onDelete: () => void;
}

function StoryRow({
  story,
  index,
  total,
  view,
  canHost,
  expanded,
  onToggle,
  onActivate,
  onRename,
  onMove,
  onRemove,
  onDelete,
}: StoryRowProps) {
  const active = story.status === "active";
  const roundOpen =
    active && (view.round?.status === "voting" || view.round?.status === "revealing");
  const deletable = canDeleteStory(view.rounds, story.id);
  const actionsId = `story-actions-${story.id}`;

  return (
    <li
      className={cn(
        "rounded-xl border",
        active ? "border-primary bg-primary-soft" : "border-line bg-surface",
      )}
    >
      <div className="flex items-start gap-3 p-3">
        <span aria-hidden className="w-5 pt-0.5 text-right font-display text-sm text-ink-subtle">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium break-words text-ink">{story.title}</p>
          <StoryStatus story={story} view={view} className="mt-1" />
        </div>
        {canHost ? (
          <IconButton
            label={expanded ? "Hide story actions" : "Show story actions"}
            aria-expanded={expanded}
            aria-controls={actionsId}
            onClick={onToggle}
            className="-my-1 -mr-1"
          >
            <ChevronDown
              aria-hidden
              className={cn(
                "size-5 transition-transform motion-reduce:transition-none",
                expanded && "rotate-180",
              )}
            />
          </IconButton>
        ) : null}
      </div>

      {canHost && expanded ? (
        <div id={actionsId} className="flex flex-wrap gap-2 border-t border-line/70 px-3 py-3">
          {!active ? (
            <Button size="sm" onClick={onActivate}>
              <Play aria-hidden className="size-3.5" />
              Make active
            </Button>
          ) : null}
          <Button variant="secondary" size="sm" onClick={onRename}>
            <Pencil aria-hidden className="size-3.5" />
            Rename
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={index === 0}
            onClick={() => onMove(index - 1)}
          >
            <ArrowUp aria-hidden className="size-3.5" />
            Move up
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={index === total - 1}
            onClick={() => onMove(index + 1)}
          >
            <ArrowDown aria-hidden className="size-3.5" />
            Move down
          </Button>
          {deletable ? (
            <Button variant="secondary" size="sm" onClick={onDelete} className="text-danger">
              <Trash2 aria-hidden className="size-3.5" />
              Delete
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              disabled={roundOpen}
              title={roundOpen ? "Finish or restart the round first" : undefined}
              onClick={onRemove}
            >
              <Archive aria-hidden className="size-3.5" />
              Remove
            </Button>
          )}
        </div>
      ) : null}
    </li>
  );
}

function StoryStatus({
  story,
  view,
  className,
}: {
  story: Story;
  view: RoomView;
  className?: string;
}) {
  if (story.status === "active") {
    const label =
      view.round?.status === "voting" || view.round?.status === "revealing"
        ? "Active · Voting"
        : view.round?.status === "revealed"
          ? "Active · Revealed"
          : "Active · Discuss";
    return (
      <Badge tone="primary" className={className}>
        {label}
      </Badge>
    );
  }

  const revealed = latestRevealedRound(view.rounds, story.id);
  if (story.status === "estimated" && revealed?.outcome) {
    const average = getRoundResults(revealed.outcome).displayAverage;
    return (
      <Badge tone="success" className={className}>
        {average ? `Estimated · avg ${average}` : "Estimated · no numeric estimate"}
      </Badge>
    );
  }

  return (
    <Badge tone="neutral" className={className}>
      Queued
    </Badge>
  );
}
