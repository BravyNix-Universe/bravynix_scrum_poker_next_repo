"use client";

import { useCallback, useSyncExternalStore } from "react";

const supportsMatchMedia = () => typeof window.matchMedia === "function";

/** Whether a CSS media query matches, kept current. False where it can't be evaluated. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (listener: () => void) => {
      if (!supportsMatchMedia()) return () => undefined;
      const list = window.matchMedia(query);
      list.addEventListener("change", listener);
      return () => list.removeEventListener("change", listener);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => supportsMatchMedia() && window.matchMedia(query).matches,
    () => false,
  );
}
