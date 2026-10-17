"use client";

import { Hourglass } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import { DiagnosticsDialog } from "./diagnostics-dialog";
import type { RoomSessionHandle } from "../../use-room-session";
import { RoomStatusPage } from "../room-status-page";

/** A participant opened the link while the host is offline; joining retries on its own (PRD 9.2). */
export function WaitingForHostPage({ handle }: { handle: RoomSessionHandle }) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <>
      <RoomStatusPage
        icon={
          <span className="flex size-16 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <Hourglass aria-hidden className="size-8 motion-safe:animate-pulse" />
          </span>
        }
        title="Waiting for the host to open the room"
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
        <p role="status">You&apos;ll join automatically as soon as they do.</p>
        <p>Keep this tab open. There&apos;s no need to refresh.</p>
      </RoomStatusPage>
      <DiagnosticsDialog open={detailsOpen} onClose={() => setDetailsOpen(false)} handle={handle} />
    </>
  );
}
