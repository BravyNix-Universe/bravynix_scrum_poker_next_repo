"use client";

import { useEffect, useState } from "react";

import { getResolveRoomRole } from "@/composition/services";
import type { RoomRole } from "@/domain/my-rooms/my-room-entry";
import { buildParticipantLink, type RoomFragment } from "@/domain/room/room-links";

/**
 * This device's role in the room, once known. A host key in the link is saved on this device
 * and then removed from the address bar, so it doesn't linger in history or on a shared screen
 * (PRD FR-045, SDD 13.1).
 */
export function useRoomRole({ roomId, hostKey }: RoomFragment): RoomRole | null {
  const [role, setRole] = useState<RoomRole | null>(null);

  useEffect(() => {
    let active = true;
    const stripHostKey = () => {
      if (!hostKey) return;
      const link = buildParticipantLink(window.location.origin, roomId);
      window.history.replaceState(window.history.state, "", link);
    };
    getResolveRoomRole()({ roomId, hostKey }).then(
      (resolved) => {
        stripHostKey();
        if (active) setRole(resolved);
      },
      () => {
        stripHostKey();
        if (active) setRole("participant");
      },
    );
    return () => {
      active = false;
    };
  }, [roomId, hostKey]);

  return role;
}
