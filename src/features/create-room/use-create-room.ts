"use client";

import { useCallback, useState } from "react";

import { SecureContextRequiredError } from "@/application/ports/room-key-service";
import type { CreatedRoom } from "@/application/room/create-room";
import { getCreateRoom } from "@/composition/services";
import { buildHostLink, buildParticipantLink } from "@/domain/room/room-links";

export interface RoomLinks {
  participant: string;
  host: string;
}

export type CreateRoomState =
  | { status: "idle" }
  | { status: "creating" }
  | { status: "created"; room: CreatedRoom; links: RoomLinks }
  | { status: "failed"; message: string };

/**
 * Creates a room in this browser and builds its links (PRD 9.1).
 * The host key stays in memory for now; secure on-device storage arrives with the room screens.
 */
export function useCreateRoom() {
  const [state, setState] = useState<CreateRoomState>({ status: "idle" });

  const create = useCallback(async (epicTitle: string) => {
    setState({ status: "creating" });
    try {
      const room = await getCreateRoom()(epicTitle);
      const origin = window.location.origin;
      setState({
        status: "created",
        room,
        links: {
          participant: buildParticipantLink(origin, room.roomId),
          host: buildHostLink(origin, room.roomId, room.hostKey),
        },
      });
    } catch (error) {
      setState({
        status: "failed",
        message:
          error instanceof SecureContextRequiredError
            ? "This browser can't create a secure room here. Open the site over https in an up-to-date browser."
            : "Something went wrong while creating the room. Please try again.",
      });
    }
  }, []);

  const reset = useCallback(() => setState({ status: "idle" }), []);

  return { state, create, reset };
}
