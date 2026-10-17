"use client";

import { useState } from "react";

import type { ConnectionStatus } from "@/application/room/room-session-state";
import type { RoomView } from "@/application/room/room-view";
import { useThrottledValue } from "@/lib/hooks/use-throttled-value";

import {
  describeRoomChange,
  describeVoteProgress,
  isSameAnnouncedRoom,
  toAnnouncedRoom,
} from "../../announcements";

/** Vote counts are read out at most this often, so a 50-person room doesn't flood (PRD 8.6). */
const VOTE_PROGRESS_INTERVAL_MS = 5_000;

/**
 * Tells screen readers what changes in the room without moving focus (PRD 8.6): connection
 * loss and recovery, story and round changes, the revealed result and, batched, vote counts.
 * The timer announces its own warnings.
 */
export function RoomAnnouncer({
  view,
  connection,
}: {
  view: RoomView;
  connection: ConnectionStatus;
}) {
  const room = toAnnouncedRoom(view, connection);
  const [previous, setPrevious] = useState(room);
  const [announcement, setAnnouncement] = useState({ id: 0, text: "" });
  const progress = useThrottledValue(describeVoteProgress(view), VOTE_PROGRESS_INTERVAL_MS);

  // Compare with the last render's room while rendering, as React recommends for derived events.
  if (!isSameAnnouncedRoom(previous, room)) {
    setPrevious(room);
    const text = describeRoomChange(previous, room);
    if (text) setAnnouncement({ id: announcement.id + 1, text });
  }

  return (
    <div className="sr-only">
      {/* A trailing no-break space on alternate messages makes a repeated message heard again. */}
      <p aria-live="polite" aria-atomic="true">
        {announcement.text}
        {announcement.id % 2 === 1 ? " " : ""}
      </p>
      <p aria-live="polite" aria-atomic="true">
        {progress}
      </p>
    </div>
  );
}
