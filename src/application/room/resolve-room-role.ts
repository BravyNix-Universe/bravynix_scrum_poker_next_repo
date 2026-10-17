import type { RoomRole } from "@/domain/my-rooms/my-room-entry";
import type { EncodedHostKey, RoomId } from "@/domain/room/room-identity";
import type { RoomFragment } from "@/domain/room/room-links";
import { roomExpiresAt } from "@/domain/rules/lifecycle";

import type { RoomCrypto } from "../ports/room-crypto";
import type { RoomStore } from "../ports/room-store";

export interface ResolveRoomRoleDependencies {
  store: RoomStore;
  crypto: Pick<RoomCrypto, "loadHostKeys" | "isRoomKey">;
  now: () => number;
}

export type ResolveRoomRole = (fragment: RoomFragment) => Promise<RoomRole>;

/**
 * A device hosts a room when it holds the room's key: it created the room, or it opened the
 * host link, whose key is saved here so the link can leave the address bar (PRD FR-045,
 * SDD 11.6). A key that doesn't belong to the room is ignored.
 */
export function makeResolveRoomRole({
  store,
  crypto,
  now,
}: ResolveRoomRoleDependencies): ResolveRoomRole {
  async function belongsToRoom(hostKey: EncodedHostKey, roomId: RoomId): Promise<boolean> {
    try {
      const keys = await crypto.loadHostKeys(hostKey);
      return await crypto.isRoomKey(roomId, keys.publicKey);
    } catch {
      return false;
    }
  }

  return async ({ roomId, hostKey }) => {
    if (hostKey && (await belongsToRoom(hostKey, roomId))) {
      // Until the room itself arrives, keep the key no longer than a new room would last.
      const record = await store.getRoom(roomId);
      await store.saveHostKey(roomId, hostKey, record?.expiresAt ?? roomExpiresAt(now()));
      return "host";
    }
    return (await store.getHostKey(roomId)) ? "host" : "participant";
  };
}
