"use client";

import { LoaderCircle } from "lucide-react";

import { PageShell } from "@/components/layout/page-shell";
import { getJoinRoom } from "@/composition/services";
import type { RoomRole } from "@/domain/my-rooms/my-room-entry";
import type { RoomId } from "@/domain/room/room-identity";
import { parseRoomFragment, type RoomFragment } from "@/domain/room/room-links";

import { RestoringRoomPage } from "./components/connection/restoring-room-page";
import { SessionProblemPage } from "./components/connection/session-problem-page";
import { WaitingForHostPage } from "./components/connection/waiting-for-host-page";
import { JoinScreen } from "./components/join/join-screen";
import { RoomStatusPage } from "./components/room-status-page";
import { RoomWorkspace } from "./components/workspace/room-workspace";
import { useLocationHash } from "./use-location-hash";
import { useRoomRole } from "./use-room-role";
import { useRoomSession } from "./use-room-session";

/** The room route: reads the room from the link fragment and shows the matching screen. */
export function RoomScreen() {
  const hash = useLocationHash();
  if (hash === null) return <PageShell>{null}</PageShell>;

  const fragment = parseRoomFragment(hash);
  if (!fragment) {
    return (
      <PageShell>
        <RoomUnavailable />
      </PageShell>
    );
  }
  return <RoomSessionScreen key={fragment.roomId} fragment={fragment} />;
}

function RoomSessionScreen({ fragment }: { fragment: RoomFragment }) {
  const role = useRoomRole(fragment);
  return role ? <RoomSessionView roomId={fragment.roomId} role={role} /> : <Connecting />;
}

function RoomSessionView({ roomId, role }: { roomId: RoomId; role: RoomRole }) {
  const { state, handle } = useRoomSession(roomId, role);

  switch (state.status) {
    case "connecting":
      return <Connecting />;
    case "restoring":
      return (
        <PageShell>
          <RestoringRoomPage handle={handle} />
        </PageShell>
      );
    case "waiting-for-host":
      return (
        <PageShell>
          <WaitingForHostPage handle={handle} />
        </PageShell>
      );
    case "lobby":
      return (
        <PageShell>
          <JoinScreen
            lobby={state.lobby}
            onJoin={async (input) => {
              const session = handle.current();
              if (session) await getJoinRoom()(session, input);
            }}
          />
        </PageShell>
      );
    case "joined":
      return (
        <RoomWorkspace
          view={state.view}
          connection={state.connection}
          notice={state.notice}
          handle={handle}
        />
      );
    case "failed":
      return (
        <PageShell>
          <SessionProblemPage problem={state.problem} handle={handle} />
        </PageShell>
      );
    case "unavailable":
      return (
        <PageShell>
          <RoomUnavailable />
        </PageShell>
      );
  }
}

function Connecting() {
  return (
    <PageShell>
      <RoomStatusPage
        icon={
          <LoaderCircle aria-hidden className="size-10 text-primary motion-safe:animate-spin" />
        }
        title="Connecting to the room…"
      >
        <p role="status">This usually takes a moment.</p>
      </RoomStatusPage>
    </PageShell>
  );
}

/** Neutral wording that never reveals whether a room existed (PRD FR-034). */
function RoomUnavailable() {
  return (
    <RoomStatusPage title="This room isn't available" homeLink>
      <p>The link may be wrong, or the room was deleted after 24 hours.</p>
    </RoomStatusPage>
  );
}
