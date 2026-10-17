import type { KeptVote, Membership, RoomRecord, RoomStore } from "@/application/ports/room-store";
import type { EncodedHostKey, RoomId } from "@/domain/room/room-identity";

interface Entry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Room data held in memory only, for browsers where IndexedDB is unavailable (some private
 * windows). Everything is lost when the tab closes; the host link still restores host control.
 */
export function createMemoryRoomStore(): RoomStore {
  const rooms = new Map<RoomId, Entry<RoomRecord>>();
  const keys = new Map<RoomId, Entry<EncodedHostKey>>();
  const memberships = new Map<RoomId, Entry<Membership>>();
  const votes = new Map<RoomId, Entry<KeptVote>>();
  const all = [rooms, keys, memberships, votes] as const;

  // Copies, as IndexedDB makes, so a caller never shares an object with the store.
  const read = <T>(entry: Entry<T> | undefined): T | null =>
    entry ? structuredClone(entry.value) : null;
  const write = <T>(value: T, expiresAt: number): Entry<T> => ({
    value: structuredClone(value),
    expiresAt,
  });

  return {
    getRoom: async (roomId) => read(rooms.get(roomId)),
    saveRoom: async (record) => void rooms.set(record.roomId, write(record, record.expiresAt)),
    getHostKey: async (roomId) => read(keys.get(roomId)),
    saveHostKey: async (roomId, hostKey, expiresAt) =>
      void keys.set(roomId, write(hostKey, expiresAt)),
    getMembership: async (roomId) => read(memberships.get(roomId)),
    saveMembership: async (roomId, membership, expiresAt) =>
      void memberships.set(roomId, write(membership, expiresAt)),
    getVote: async (roomId) => read(votes.get(roomId)),
    saveVote: async (roomId, vote, expiresAt) => void votes.set(roomId, write(vote, expiresAt)),
    deleteVote: async (roomId) => void votes.delete(roomId),
    deleteRoom: async (roomId) => all.forEach((map) => map.delete(roomId)),
    purgeExpired: async (now) => {
      for (const map of all) {
        for (const [roomId, entry] of map as Map<RoomId, Entry<unknown>>) {
          if (entry.expiresAt <= now) map.delete(roomId);
        }
      }
    },
  };
}
