import type { RoomView } from "@/application/room/room-view";
import { Container } from "@/components/layout/container";
import { Wordmark } from "@/components/layout/wordmark";
import type { Participant } from "@/domain/room/room";

import { InviteButton } from "./invite-button";
import { RoomMenu } from "./room-menu";
import { TimerControl } from "./timer-control";

export interface RoomTopBarProps {
  view: RoomView;
  me: Participant;
  isPreview: boolean;
  /** True for the host of an active room. */
  canHost: boolean;
  onStartTimer: (durationMs: number) => void;
  onStopTimer: () => void;
  onChangeProfile: () => void;
  onEndRoom: () => void;
  onForgetRoom: () => void;
}

/**
 * Product identity, Epic name, timer, invite, connection and the person's own menu (PRD 8.3).
 * An ended room drops the timer and the invite: there is nothing left to vote on.
 */
export function RoomTopBar({
  view,
  me,
  isPreview,
  canHost,
  onStartTimer,
  onStopTimer,
  onChangeProfile,
  onEndRoom,
  onForgetRoom,
}: RoomTopBarProps) {
  const active = view.status === "active";

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface">
      <Container className="flex h-16 items-center justify-between gap-2 sm:gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Wordmark className="hidden sm:inline" />
          <span aria-hidden className="hidden h-4 w-px bg-line sm:block" />
          <h1 className="truncate font-display text-base font-bold text-ink sm:text-lg">
            {view.epicTitle}
          </h1>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {active ? (
            <>
              <TimerControl
                timer={view.timer}
                canHost={canHost}
                onStart={onStartTimer}
                onStop={onStopTimer}
              />
              <InviteButton roomId={view.roomId} />
            </>
          ) : null}
          <ConnectionStatus isPreview={isPreview} />
          <div className="border-l border-line pl-1 sm:pl-2">
            <RoomMenu
              me={me}
              expiresAt={view.expiresAt}
              canEnd={canHost}
              onChangeProfile={onChangeProfile}
              onEndRoom={onEndRoom}
              onForgetRoom={onForgetRoom}
            />
          </div>
        </div>
      </Container>
    </header>
  );
}

function ConnectionStatus({ isPreview }: { isPreview: boolean }) {
  return (
    <span className="hidden items-center gap-1.5 text-xs font-medium text-ink-muted lg:inline-flex">
      <span
        aria-hidden
        className={isPreview ? "size-2 rounded-full bg-accent" : "size-2 rounded-full bg-success"}
      />
      {isPreview ? "Preview" : "Connected"}
    </span>
  );
}
