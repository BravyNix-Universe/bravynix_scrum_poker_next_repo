"use client";

import { useEffect, useState } from "react";

/**
 * The current time in milliseconds, refreshed every `intervalMs` while `enabled`. When it
 * stops ticking it keeps the last value, so a paused clock costs nothing.
 */
export function useNow(intervalMs: number, enabled = true): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) return;
    // Catch up at once: the value may be stale after a pause.
    const first = window.setTimeout(() => setNow(Date.now()), 0);
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [intervalMs, enabled]);

  return now;
}
