"use client";

import { useMemo, useSyncExternalStore } from "react";

import type { ConnectionDiagnostics, RoomSession } from "@/application/ports/room-session";
import type { RoomSessionState } from "@/application/room/room-session-state";
import { openRoomSession } from "@/composition/services";
import type { RoomRole } from "@/domain/my-rooms/my-room-entry";
import type { RoomId } from "@/domain/room/room-identity";

const CONNECTING: RoomSessionState = { status: "connecting" };
const CONNECTING_DIAGNOSTICS: ConnectionDiagnostics = {
  state: "connecting",
  path: null,
  serviceReachable: null,
  lastError: null,
};

export interface RoomSessionHandle {
  subscribe(listener: () => void): () => void;
  getState(): RoomSessionState;
  getDiagnostics(): ConnectionDiagnostics;
  /** The open session, once something has subscribed. Use only in event handlers. */
  current(): RoomSession | null;
}

/**
 * Opens the session when the first component subscribes and closes it when the last one
 * unsubscribes, so rendering stays free of side effects (React may render more than once).
 */
export function createRoomSessionHandle(open: () => RoomSession): RoomSessionHandle {
  let session: RoomSession | null = null;
  let subscribers = 0;

  return {
    subscribe(listener) {
      session ??= open();
      subscribers += 1;
      const unsubscribe = session.subscribe(listener);
      return () => {
        unsubscribe();
        subscribers -= 1;
        if (subscribers === 0) {
          session?.close();
          session = null;
        }
      };
    },
    getState: () => session?.getState() ?? CONNECTING,
    getDiagnostics: () => session?.getDiagnostics() ?? CONNECTING_DIAGNOSTICS,
    current: () => session,
  };
}

/** The live state of one room, plus a handle for sending commands. */
export function useRoomSession(roomId: RoomId, role: RoomRole) {
  const handle = useMemo(
    () => createRoomSessionHandle(() => openRoomSession({ roomId, role })),
    [roomId, role],
  );
  const state = useSyncExternalStore(handle.subscribe, handle.getState, () => CONNECTING);
  return { state, handle };
}

/** The connection details behind the diagnostics panel, kept current (PRD FR-053). */
export function useConnectionDiagnostics(handle: RoomSessionHandle): ConnectionDiagnostics {
  return useSyncExternalStore(
    handle.subscribe,
    handle.getDiagnostics,
    () => CONNECTING_DIAGNOSTICS,
  );
}
