import { Flag, Hourglass, ListOrdered, ListPlus } from "lucide-react";

import { Button } from "@/components/ui/button";

import { StoryTitleForm } from "./story-title-form";

export interface EmptyRoomProps {
  canHost: boolean;
  ended: boolean;
  hasStories: boolean;
  onAddStory: (title: string) => void;
  onOpenStories: () => void;
}

const panel = "rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-8";
const waiting =
  "flex flex-col items-center rounded-2xl border border-dashed border-line-strong/50 bg-surface px-6 py-12 text-center";

/**
 * No active story (PRD 8.5). The host gets a way forward: add the first story, or pick one from
 * the queue. Everyone else waits, or reads the history of an ended room.
 */
export function EmptyRoom({
  canHost,
  ended,
  hasStories,
  onAddStory,
  onOpenStories,
}: EmptyRoomProps) {
  if (canHost && !hasStories) {
    return (
      <section aria-labelledby="empty-title" className={panel}>
        <ListPlus aria-hidden className="size-8 text-primary" />
        <h2 id="empty-title" className="mt-3 font-display text-2xl font-bold text-primary-strong">
          Add your first story
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          A story is just a title. Add more any time, before or during the meeting.
        </p>
        <StoryTitleForm onSubmit={onAddStory} className="mt-6 max-w-2xl" />
      </section>
    );
  }

  if (canHost) {
    return (
      <section aria-labelledby="empty-title" className={panel}>
        <ListOrdered aria-hidden className="size-8 text-primary" />
        <h2 id="empty-title" className="mt-3 font-display text-2xl font-bold text-primary-strong">
          Pick the next story
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Choose one from the queue to make it active, or add another.
        </p>
        <Button className="mt-6" onClick={onOpenStories}>
          <ListOrdered aria-hidden className="size-4" />
          Open stories
        </Button>
      </section>
    );
  }

  if (ended) {
    return (
      <section aria-labelledby="empty-title" className={waiting}>
        <Flag aria-hidden className="size-8 text-ink-subtle" />
        <h2 id="empty-title" className="mt-3 font-display text-xl font-bold text-ink">
          No story was active when the room ended.
        </h2>
        <p className="mt-1 text-sm text-ink-muted">History shows every revealed round.</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="empty-title" className={waiting}>
      <Hourglass aria-hidden className="size-8 text-ink-subtle" />
      <h2 id="empty-title" role="status" className="mt-3 font-display text-xl font-bold text-ink">
        {hasStories
          ? "Waiting for the host to pick a story."
          : "Waiting for the host to add a story."}
      </h2>
    </section>
  );
}
