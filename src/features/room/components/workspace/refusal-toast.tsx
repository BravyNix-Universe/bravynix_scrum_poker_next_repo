"use client";

import { CircleAlert, X } from "lucide-react";
import { useEffect, useState } from "react";

import type { RoomNotice } from "@/application/room/room-session-state";
import { IconButton } from "@/components/ui/icon-button";

import { REFUSAL_MESSAGES } from "../../refusal-messages";

/** How long a message stays up. Hovering or focusing it keeps it open (WCAG 2.2.1). */
const VISIBLE_MS = 8_000;

/** Shows why the room refused the person's last action (PRD 8.7, FR-056). */
export function RefusalToast({ notice }: { notice: RoomNotice | null }) {
  const [dismissedId, setDismissedId] = useState<number | null>(null);
  const [held, setHeld] = useState(false);
  const shown = notice !== null && notice.id !== dismissedId ? notice : null;

  useEffect(() => {
    if (!shown || held) return;
    const timer = setTimeout(() => setDismissedId(shown.id), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [shown, held]);

  if (!shown) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div
        key={shown.id}
        onMouseEnter={() => setHeld(true)}
        onMouseLeave={() => setHeld(false)}
        onFocus={() => setHeld(true)}
        onBlur={() => setHeld(false)}
        className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl bg-night py-3 pr-2 pl-4 text-sm text-night-ink shadow-overlay"
      >
        <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
        <p role="alert" className="flex-1 pt-px">
          {REFUSAL_MESSAGES[shown.refusal]}
        </p>
        <IconButton
          label="Dismiss"
          onClick={() => {
            setDismissedId(shown.id);
            setHeld(false);
          }}
          className="-my-1.5 size-8 text-night-ink hover:bg-night-line hover:text-white"
        >
          <X aria-hidden className="size-4" />
        </IconButton>
      </div>
    </div>
  );
}
