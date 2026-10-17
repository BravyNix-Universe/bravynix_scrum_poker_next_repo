"use client";

import { useSyncExternalStore } from "react";

function subscribe(listener: () => void): () => void {
  document.addEventListener("visibilitychange", listener);
  return () => document.removeEventListener("visibilitychange", listener);
}

/** True while this tab is in the background or minimised. */
export function useDocumentHidden(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => document.visibilityState === "hidden",
    () => false,
  );
}
