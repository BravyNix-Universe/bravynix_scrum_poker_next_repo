"use client";

import { Activity, ChevronDown, Clock, Flag, Trash2, UserPen } from "lucide-react";
import type { ComponentProps } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Popover, type PopoverTriggerProps } from "@/components/ui/popover";
import { displayNameOf } from "@/domain/room/profile";
import type { Participant } from "@/domain/room/room";
import { cn } from "@/lib/cn";

import { RoomCountdown } from "../room-countdown";

export interface RoomMenuProps {
  me: Participant;
  expiresAt: number;
  /** End room shows only for the host of an active room. */
  canEnd: boolean;
  onChangeProfile: () => void;
  onShowDiagnostics: () => void;
  onEndRoom: () => void;
  onForgetRoom: () => void;
}

/** The person's own chip, opening their profile and room actions (PRD FR-049, FR-022, 9.6). */
export function RoomMenu({
  me,
  expiresAt,
  canEnd,
  onChangeProfile,
  onShowDiagnostics,
  onEndRoom,
  onForgetRoom,
}: RoomMenuProps) {
  const name = displayNameOf(me);

  return (
    <Popover
      label="Your profile and room options"
      className="w-64 p-2"
      trigger={(props: PopoverTriggerProps) => (
        <button
          type="button"
          {...props}
          className="flex h-10 items-center gap-2 rounded-lg px-1.5 hover:bg-surface-muted"
        >
          <Avatar avatarId={me.avatarId} size="sm" />
          {/* The accessible name starts with the visible text (WCAG 2.5.3). */}
          <span className="max-w-32 truncate text-sm font-medium text-ink max-md:sr-only">
            {name}
          </span>
          {me.isHost ? (
            <>
              {" "}
              <Badge tone="warning" className="max-sm:hidden">
                Host
              </Badge>
            </>
          ) : null}
          <span className="sr-only">: profile and room options</span>
          <ChevronDown aria-hidden className="size-4 text-ink-muted" />
        </button>
      )}
    >
      {(close) => {
        const run = (action: () => void) => () => {
          close();
          action();
        };
        return (
          <div className="flex flex-col">
            <div className="flex items-center gap-3 px-2 pt-2 pb-3">
              <Avatar avatarId={me.avatarId} size="md" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{name}</p>
                <p className="text-xs text-ink-muted">{me.isHost ? "Host" : "Participant"}</p>
              </div>
            </div>
            <MenuItem onClick={run(onChangeProfile)}>
              <UserPen aria-hidden className="size-4" />
              Change name and avatar
            </MenuItem>
            <MenuItem onClick={run(onShowDiagnostics)}>
              <Activity aria-hidden className="size-4" />
              Connection details
            </MenuItem>

            <p className="mt-1 flex items-center gap-2 border-t border-line px-3 pt-3 pb-2 text-xs text-ink-muted">
              <Clock aria-hidden className="size-3.5 shrink-0" />
              <RoomCountdown expiresAt={expiresAt} />
            </p>

            <div className="mt-1 border-t border-line pt-1">
              {canEnd ? (
                <MenuItem tone="danger" onClick={run(onEndRoom)}>
                  <Flag aria-hidden className="size-4" />
                  End room
                </MenuItem>
              ) : null}
              <MenuItem tone="danger" onClick={run(onForgetRoom)}>
                <Trash2 aria-hidden className="size-4" />
                Delete from this device
              </MenuItem>
            </div>
          </div>
        );
      }}
    </Popover>
  );
}

function MenuItem({
  tone = "neutral",
  className,
  ...props
}: ComponentProps<"button"> & { tone?: "neutral" | "danger" }) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium",
        tone === "danger"
          ? "text-danger hover:bg-danger-soft/60"
          : "text-ink hover:bg-surface-muted",
        className,
      )}
      {...props}
    />
  );
}
