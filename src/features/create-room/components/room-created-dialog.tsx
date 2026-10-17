"use client";

import { Laptop, TriangleAlert } from "lucide-react";

import type { CreatedRoom } from "@/application/room/create-room";
import { buttonStyles } from "@/components/ui/button";
import { CopyField } from "@/components/ui/copy-field";
import { Dialog } from "@/components/ui/dialog";
import { formatLinkForDisplay, maskHostLink } from "@/domain/room/room-links";

import type { RoomLinks } from "../use-create-room";

export interface RoomCreatedDialogProps {
  result: { room: CreatedRoom; links: RoomLinks } | null;
  onClose: () => void;
}

/** Shown once a room exists: the participant link and the private host link (PRD 8.2, FR-045). */
export function RoomCreatedDialog({ result, onClose }: RoomCreatedDialogProps) {
  return (
    <Dialog
      open={result !== null}
      onClose={onClose}
      title="Your room is ready"
      description={
        result ? (
          <>
            Epic: {result.room.epicTitle} <span aria-hidden>•</span> Room deletes in 24 hours
          </>
        ) : null
      }
    >
      {result ? (
        <div className="mt-6 flex flex-col gap-6">
          <CopyField
            label="Participant invite link"
            value={result.links.participant}
            displayValue={formatLinkForDisplay(result.links.participant)}
            copyLabel="Copy invite link"
            hint="Share this link with developers, testers and product managers."
          />

          <div className="flex flex-col gap-3">
            <CopyField
              label="Host link (private)"
              value={result.links.host}
              displayValue={formatLinkForDisplay(maskHostLink(result.links.host))}
              copyLabel="Copy host link"
            />
            <p className="flex gap-3 rounded-lg bg-accent-soft p-4 text-sm text-ink">
              <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-accent-ink" />
              <span>
                <strong className="font-semibold text-accent-ink">
                  Anyone with this link controls the room.
                </strong>{" "}
                Keep it private. You&apos;ll need it to host from another device.
              </span>
            </p>
          </div>

          <p className="flex gap-3 text-sm text-ink-muted">
            <Laptop aria-hidden className="mt-0.5 size-4 shrink-0" />
            Keep this tab open during the meeting. For more than 15 people, use a laptop.
          </p>

          <a
            href={result.links.participant}
            className={buttonStyles({ size: "lg", fullWidth: true })}
          >
            Go to room
          </a>
        </div>
      ) : null}
    </Dialog>
  );
}
