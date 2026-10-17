"use client";

import { History } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import { DiagnosticsDialog } from "./diagnostics-dialog";
import type { RoomSessionHandle } from "../../use-room-session";
import { RoomStatusPage } from "../room-status-page";

/**
 * The host opened the host link on a device that doesn't have the room yet (PRD 9.7 step 3).
 * The room comes back from the signed copy of the first person in it who connects.
 */
export function RestoringRoomPage({ handle }: { handle: RoomSessionHandle }) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <>
      <RoomStatusPage
        icon={
          <span className="flex size-16 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <History aria-hidden className="size-8 motion-safe:animate-pulse" />
          </span>
        }
        title="Restoring your room"
        actions={
          <Button
            variant="secondary"
            className="max-sm:w-full"
            onClick={() => setDetailsOpen(true)}
          >
            Connection details
          </Button>
        }
      >
        <p role="status">
          You&apos;re the host on this device. The room&apos;s stories and history come back as soon
          as someone who was in it reconnects.
        </p>
        <p>Keep this tab open. Everyone rejoins on their own.</p>
      </RoomStatusPage>
      <DiagnosticsDialog open={detailsOpen} onClose={() => setDetailsOpen(false)} handle={handle} />
    </>
  );
}
