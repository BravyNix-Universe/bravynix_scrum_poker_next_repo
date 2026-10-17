"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";

import { Container } from "@/components/layout/container";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { getForgetRoom } from "@/composition/services";
import type { MyRoomEntry } from "@/domain/my-rooms/my-room-entry";
import { ROOM_PATH } from "@/domain/room/room-links";
import { cn } from "@/lib/cn";
import { formatTimeLeft, isExpiringSoon } from "@/lib/format/time-left";
import { useNow } from "@/lib/hooks/use-now";

import { useMyRooms } from "../use-my-rooms";
import { DeleteRoomDialog } from "./delete-room-dialog";

const ROLE_LABELS = { host: "Host", participant: "Participant" } as const;

/** "My rooms" on this device (PRD 8.1, FR-050). Hidden until the device has a room. */
export function MyRoomsSection() {
  const rooms = useMyRooms();
  const now = useNow(30_000);
  const [pendingDelete, setPendingDelete] = useState<MyRoomEntry | null>(null);

  if (rooms.length === 0) return null;

  return (
    <section aria-labelledby="my-rooms-title" className="pb-4">
      <Container>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 id="my-rooms-title" className="font-display text-xl font-bold text-ink">
            My rooms
          </h2>
          <p className="text-sm text-ink-muted">Active rooms on this device</p>
        </div>

        <ul className="mt-4 divide-y divide-line rounded-xl border border-line bg-surface">
          {rooms.map((room) => (
            <li
              key={room.roomId}
              className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="truncate font-display text-base font-semibold text-ink">
                  {room.epicTitle}
                </span>
                <Badge tone={room.role === "host" ? "primary" : "neutral"}>
                  {ROLE_LABELS[room.role]}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-4 sm:justify-end">
                <span
                  className={cn(
                    "text-sm",
                    isExpiringSoon(room.expiresAt, now) ? "text-accent-ink" : "text-ink-muted",
                  )}
                >
                  {formatTimeLeft(room.expiresAt, now)}
                </span>
                <div className="flex items-center gap-1">
                  <a
                    href={`${ROOM_PATH}#${room.roomId}`}
                    className={buttonStyles({
                      variant: "secondary",
                      size: "sm",
                    })}
                    aria-label={`Open ${room.epicTitle}`}
                  >
                    Open
                  </a>
                  <IconButton
                    label={`Delete ${room.epicTitle} from this device`}
                    onClick={() => setPendingDelete(room)}
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </IconButton>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Container>

      <DeleteRoomDialog
        room={pendingDelete}
        onCancel={() => setPendingDelete(null)}
        onConfirm={(room) => {
          void getForgetRoom()(room.roomId).catch(() => undefined);
          setPendingDelete(null);
        }}
      />
    </section>
  );
}
