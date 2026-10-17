"use client";

import { useEffect } from "react";

import { useDocumentHidden } from "./use-document-hidden";

/**
 * Keeps the screen on while `enabled`, where the browser supports it (Screen Wake Lock API).
 * Browsers drop the lock when the tab is hidden, so it is taken again when the tab returns.
 * A refusal (battery saver, for example) is ignored: the room works without it.
 */
export function useScreenWakeLock(enabled: boolean): void {
  const hidden = useDocumentHidden();

  useEffect(() => {
    if (!enabled || hidden || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let released = false;
    navigator.wakeLock
      .request("screen")
      .then((sentinel) => {
        if (released) void sentinel.release();
        else lock = sentinel;
      })
      .catch(() => undefined);
    return () => {
      released = true;
      void lock?.release();
    };
  }, [enabled, hidden]);
}
