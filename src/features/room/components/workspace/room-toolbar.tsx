import { History, ListOrdered } from "lucide-react";

import type { RoomView } from "@/application/room/room-view";
import { Button } from "@/components/ui/button";
import { visibleStories } from "@/domain/room/room";

export interface RoomToolbarProps {
  view: RoomView;
  onOpenStories: () => void;
  onOpenHistory: () => void;
}

/** Opens the story queue and the round history, which live in side panels (PRD 8.3, 8.4). */
export function RoomToolbar({ view, onOpenStories, onOpenHistory }: RoomToolbarProps) {
  const storyCount = visibleStories(view.stories).length;
  const revealedCount = view.rounds.filter((round) => round.status === "revealed").length;

  return (
    <nav aria-label="Room panels" className="flex flex-wrap items-center gap-2">
      <Button variant="secondary" size="sm" aria-haspopup="dialog" onClick={onOpenStories}>
        <ListOrdered aria-hidden className="size-4" />
        Stories
        <Count value={storyCount} />
      </Button>
      <Button variant="secondary" size="sm" aria-haspopup="dialog" onClick={onOpenHistory}>
        <History aria-hidden className="size-4" />
        History
        <Count value={revealedCount} />
      </Button>
    </nav>
  );
}

function Count({ value }: { value: number }) {
  return (
    <span className="min-w-5 rounded-full bg-surface-muted px-1.5 py-px text-center text-2xs font-semibold text-ink-muted tabular-nums">
      {value}
    </span>
  );
}
