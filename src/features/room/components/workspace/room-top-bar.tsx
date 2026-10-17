import type { ConnectionStatus } from "@/application/room/room-session-state";
import type { RoomView } from "@/application/room/room-view";
import { Container } from "@/components/layout/container";
import { Wordmark } from "@/components/layout/wordmark";
import type { Participant } from "@/domain/room/room";
import { cn } from "@/lib/cn";

import { InviteButton } from "./invite-button";
import { RoomMenu } from "./room-menu";
import { TimerControl } from "./timer-control";

export interface RoomTopBarProps {
  view: RoomView;
  me: Participant;
  connection: ConnectionStatus;
  isPreview: boolean;
  /** True for the host of an active room. */
  canHost: boolean;
  onStartTimer: (durationMs: number) => void;
  onStopTimer: () => void;
  onChangeProfile: () => void;
  onShowDiagnostics: () => void;
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
  connection,
  isPreview,
  canHost,
  onStartTimer,
  onStopTimer,
  onChangeProfile,
  onShowDiagnostics,
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
          <ConnectionIndicator
            connection={connection}
            isPreview={isPreview}
            onClick={onShowDiagnostics}
          />
          <div className="border-l border-line pl-1 sm:pl-2">
            <RoomMenu
              me={me}
              expiresAt={view.expiresAt}
              canEnd={canHost}
              onChangeProfile={onChangeProfile}
              onShowDiagnostics={onShowDiagnostics}
              onEndRoom={onEndRoom}
              onForgetRoom={onForgetRoom}
            />
          </div>
        </div>
      </Container>
    </header>
  );
}

const INDICATOR: Record<ConnectionStatus, { label: string; dot: string }> = {
  connected: { label: "Connected", dot: "bg-success" },
  reconnecting: { label: "Reconnecting…", dot: "bg-danger motion-safe:animate-pulse" },
  "host-away": { label: "Host away", dot: "bg-accent" },
};

/** The connection at a glance, written out as well as coloured; opens the details (FR-053). */
function ConnectionIndicator({
  connection,
  isPreview,
  onClick,
}: {
  connection: ConnectionStatus;
  isPreview: boolean;
  onClick: () => void;
}) {
  const { label, dot } =
    isPreview && connection === "connected"
      ? { label: "Preview", dot: "bg-accent" }
      : INDICATOR[connection];

  return (
    <button
      type="button"
      onClick={onClick}
      className="hidden h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-ink-muted hover:bg-surface-muted hover:text-ink lg:inline-flex"
    >
      <span aria-hidden className={cn("size-2 rounded-full", dot)} />
      {label}
      <span className="sr-only">: connection details</span>
    </button>
  );
}
