"use client";

import { formatDuration } from "@/lib/format/time-left";
import { useNow } from "@/lib/hooks/use-now";

const REFRESH_MS = 30_000;

/** "Room deletes in 23 h 48 min" (PRD FR-023; open question 9: show the time left). */
export function RoomCountdown({ expiresAt, className }: { expiresAt: number; className?: string }) {
  const now = useNow(REFRESH_MS);
  return (
    <span className={className}>
      Room deletes in <strong className="font-semibold">{formatDuration(expiresAt - now)}</strong>
    </span>
  );
}
