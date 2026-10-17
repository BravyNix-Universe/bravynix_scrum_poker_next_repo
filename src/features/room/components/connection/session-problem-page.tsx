"use client";

import {
  CloudOff,
  type LucideIcon,
  MonitorSmartphone,
  RefreshCw,
  RotateCw,
  ShieldAlert,
  Users,
  WifiOff,
} from "lucide-react";
import { useState } from "react";

import type { SessionProblem } from "@/application/room/room-session-state";
import { Button } from "@/components/ui/button";

import { DiagnosticsDialog } from "./diagnostics-dialog";
import { PROBLEM_COPY } from "./problem-copy";
import type { RoomSessionHandle } from "../../use-room-session";
import { RoomStatusPage } from "../room-status-page";

const ICONS: Record<SessionProblem, LucideIcon> = {
  "service-unreachable": CloudOff,
  "host-unreachable": WifiOff,
  "host-unverified": ShieldAlert,
  "room-full": Users,
  "open-elsewhere": MonitorSmartphone,
  "outdated-app": RefreshCw,
};

/** Why this device can't be in the room, and what to try (PRD 8.5, 16). */
export function SessionProblemPage({
  problem,
  handle,
}: {
  problem: SessionProblem;
  handle: RoomSessionHandle;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const copy = PROBLEM_COPY[problem];
  const Icon = ICONS[problem];

  return (
    <>
      <RoomStatusPage
        focusTitle
        homeLink
        icon={
          <span className="flex size-16 items-center justify-center rounded-2xl bg-danger-soft text-danger">
            <Icon aria-hidden className="size-8" />
          </span>
        }
        title={copy.title}
        actions={
          <>
            {copy.action === "refresh" ? (
              <Button className="max-sm:w-full" onClick={() => window.location.reload()}>
                <RefreshCw aria-hidden className="size-4" />
                Refresh
              </Button>
            ) : (
              <Button className="max-sm:w-full" onClick={() => handle.current()?.retry()}>
                <RotateCw aria-hidden className="size-4" />
                Try again
              </Button>
            )}
            <Button
              variant="secondary"
              className="max-sm:w-full"
              onClick={() => setDetailsOpen(true)}
            >
              Connection details
            </Button>
          </>
        }
      >
        {copy.body.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </RoomStatusPage>
      <DiagnosticsDialog open={detailsOpen} onClose={() => setDetailsOpen(false)} handle={handle} />
    </>
  );
}
