import type { RoomView } from "@/application/room/room-view";
import { Container } from "@/components/layout/container";
import { Wordmark } from "@/components/layout/wordmark";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { displayNameOf } from "@/domain/room/profile";
import type { Participant } from "@/domain/room/room";

import { RoomCountdown } from "../room-countdown";
import { InviteButton } from "./invite-button";

export interface RoomTopBarProps {
  view: RoomView;
  me: Participant;
  isPreview: boolean;
}

/** Product identity, Epic name, invite, time left, connection and the person's own chip (PRD 8.3). */
export function RoomTopBar({ view, me, isPreview }: RoomTopBarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface">
      <Container className="flex h-16 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Wordmark className="hidden sm:inline" />
          <span aria-hidden className="hidden h-4 w-px bg-line sm:block" />
          <h1 className="truncate font-display text-base font-bold text-ink sm:text-lg">
            {view.epicTitle}
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <RoomCountdown
            expiresAt={view.expiresAt}
            className="hidden text-xs text-ink-muted lg:inline"
          />
          <InviteButton roomId={view.roomId} />
          <ConnectionStatus isPreview={isPreview} />
          <div className="flex items-center gap-2 border-l border-line pl-3">
            <Avatar avatarId={me.avatarId} size="sm" />
            <span className="hidden max-w-32 truncate text-sm font-medium text-ink md:inline">
              {displayNameOf(me)}
            </span>
            {me.isHost ? <Badge tone="warning">Host</Badge> : null}
          </div>
        </div>
      </Container>
    </header>
  );
}

function ConnectionStatus({ isPreview }: { isPreview: boolean }) {
  return (
    <span className="hidden items-center gap-1.5 text-xs font-medium text-ink-muted sm:inline-flex">
      <span
        aria-hidden
        className={isPreview ? "size-2 rounded-full bg-accent" : "size-2 rounded-full bg-success"}
      />
      {isPreview ? "Preview" : "Connected"}
    </span>
  );
}
