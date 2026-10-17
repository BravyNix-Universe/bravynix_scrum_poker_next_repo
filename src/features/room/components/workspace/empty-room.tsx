import { ListPlus, Hourglass } from "lucide-react";

import { StoryTitleForm } from "./story-title-form";

export interface EmptyRoomProps {
  isHost: boolean;
  hasStories: boolean;
  onAddStory: (title: string) => void;
}

/** No active story yet (PRD 8.5): the host gets an add-story prompt, everyone else waits. */
export function EmptyRoom({ isHost, hasStories, onAddStory }: EmptyRoomProps) {
  if (isHost && !hasStories) {
    return (
      <section
        aria-labelledby="empty-title"
        className="rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-8"
      >
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

  return (
    <section
      aria-labelledby="empty-title"
      className="flex flex-col items-center rounded-2xl border border-dashed border-line-strong/50 bg-surface px-6 py-12 text-center"
    >
      <Hourglass aria-hidden className="size-8 text-ink-subtle" />
      <h2 id="empty-title" role="status" className="mt-3 font-display text-xl font-bold text-ink">
        {hasStories
          ? "Waiting for the host to pick a story."
          : "Waiting for the host to add a story."}
      </h2>
    </section>
  );
}
