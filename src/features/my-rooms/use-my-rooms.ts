"use client";

import { useSyncExternalStore } from "react";

import { getMyRoomsRepository } from "@/composition/services";
import type { MyRoomEntry } from "@/domain/my-rooms/my-room-entry";

const EXPIRY_CHECK_INTERVAL_MS = 30_000;
const NO_ROOMS: readonly MyRoomEntry[] = [];

let cached: { key: string; rooms: readonly MyRoomEntry[] } = {
  key: "[]",
  rooms: NO_ROOMS,
};

function getSnapshot(): readonly MyRoomEntry[] {
  const rooms = getMyRoomsRepository().list(Date.now());
  const key = JSON.stringify(rooms);
  if (key !== cached.key) cached = { key, rooms };
  return cached.rooms;
}

function getServerSnapshot(): readonly MyRoomEntry[] {
  return NO_ROOMS;
}

function subscribe(onChange: () => void): () => void {
  const unsubscribe = getMyRoomsRepository().subscribe(onChange);
  // Rooms must vanish from the list at their deadline even when nothing else changes (FR-023).
  const timer = window.setInterval(onChange, EXPIRY_CHECK_INTERVAL_MS);
  return () => {
    unsubscribe();
    window.clearInterval(timer);
  };
}

/** Rooms this device created or joined that haven't expired, newest first. */
export function useMyRooms(): readonly MyRoomEntry[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
