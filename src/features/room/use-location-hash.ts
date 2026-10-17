"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

/** The current `location.hash`, or null while rendering on the server. */
export function useLocationHash(): string | null {
  return useSyncExternalStore(
    subscribe,
    () => window.location.hash,
    () => null,
  );
}
