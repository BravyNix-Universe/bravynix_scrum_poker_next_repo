"use client";

import { LoaderCircle } from "lucide-react";
import { useState } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { getJoinRoom, getResolveRoomRole } from "@/composition/services";
import { parseRoomFragment, type RoomFragment } from "@/domain/room/room-links";

import { JoinScreen } from "./components/join/join-screen";
import { RoomStatusPage } from "./components/room-status-page";
import { RoomWorkspace } from "./components/workspace/room-workspace";
import { useLocationHash } from "./use-location-hash";
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
  // The role is fixed when the room opens, so later changes to the address don't switch it.
  const [role] = useState(() => getResolveRoomRole()(fragment));
  const { state, handle } = useRoomSession(fragment.roomId, role);

  switch (state.status) {
    case "connecting":
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
      return <RoomWorkspace view={state.view} handle={handle} />;
    case "unavailable":
      return (
        <PageShell>
          <RoomUnavailable />
        </PageShell>
      );
  }
}

/** Neutral wording that never reveals whether a room existed (PRD FR-034). */
function RoomUnavailable() {
  return (
    <RoomStatusPage title="This room isn't available" homeLink>
      <p>The link may be wrong, or the room was deleted after 24 hours.</p>
    </RoomStatusPage>
  );
}
