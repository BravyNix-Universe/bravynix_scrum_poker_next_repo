import type { KeptVote, Membership, RoomRecord, RoomStore } from "@/application/ports/room-store";
import type { EncodedHostKey, RoomId } from "@/domain/room/room-identity";

import { createMemoryRoomStore } from "./memory-room-store";

/**
 * IndexedDB adapter for room data (SDD 10, "Where each kind of data is stored"). One object
 * store per kind of data, each keyed by room ID and carrying the room's deletion time, so
 * purging expired rooms is one pass (SDD 11.5).
 */
const DB_NAME = "bravynix-poker";
const DB_VERSION = 1;
const STORES = ["rooms", "keys", "memberships", "votes"] as const;
type StoreName = (typeof STORES)[number];

interface Entry<T> {
  roomId: RoomId;
  expiresAt: number;
  value: T;
}

function settled<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function completed(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error ?? new Error("Transaction aborted"));
  });
}

function openDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      for (const name of STORES) {
        if (!database.objectStoreNames.contains(name)) {
          database.createObjectStore(name, { keyPath: "roomId" });
        }
      }
    };
    request.onsuccess = () => {
      const database = request.result;
      // A newer version of the app in another tab needs the database: let it upgrade.
      database.onversionchange = () => database.close();
      resolve(database);
    };
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("The room database is blocked by another tab"));
  });
}

export interface IndexedDbRoomStore extends RoomStore {
  /** Resolves once the database is open; rejects if this browser won't open it. */
  ready(): Promise<void>;
}

export function createIndexedDbRoomStore(factory: IDBFactory): IndexedDbRoomStore {
  let database: Promise<IDBDatabase> | null = null;
  const db = () => (database ??= openDatabase(factory));

  async function get<T>(name: StoreName, roomId: RoomId): Promise<T | null> {
    const transaction = (await db()).transaction(name, "readonly");
    const entry = await settled<Entry<T> | undefined>(transaction.objectStore(name).get(roomId));
    return entry?.value ?? null;
  }

  async function put<T>(name: StoreName, roomId: RoomId, value: T, expiresAt: number) {
    const transaction = (await db()).transaction(name, "readwrite");
    const entry: Entry<T> = { roomId, expiresAt, value };
    transaction.objectStore(name).put(entry);
    await completed(transaction);
  }

  async function remove(names: readonly StoreName[], roomId: RoomId) {
    const transaction = (await db()).transaction(names, "readwrite");
    for (const name of names) transaction.objectStore(name).delete(roomId);
    await completed(transaction);
  }

  return {
    ready: async () => void (await db()),
    getRoom: (roomId) => get<RoomRecord>("rooms", roomId),
    saveRoom: (record) => put("rooms", record.roomId, record, record.expiresAt),
    getHostKey: (roomId) => get<EncodedHostKey>("keys", roomId),
    saveHostKey: (roomId, hostKey, expiresAt) => put("keys", roomId, hostKey, expiresAt),
    getMembership: (roomId) => get<Membership>("memberships", roomId),
    saveMembership: (roomId, membership, expiresAt) =>
      put("memberships", roomId, membership, expiresAt),
    getVote: (roomId) => get<KeptVote>("votes", roomId),
    saveVote: (roomId, vote, expiresAt) => put("votes", roomId, vote, expiresAt),
    deleteVote: (roomId) => remove(["votes"], roomId),
    deleteRoom: (roomId) => remove(STORES, roomId),

    async purgeExpired(now) {
      const transaction = (await db()).transaction(STORES, "readwrite");
      for (const name of STORES) {
        const request = transaction.objectStore(name).openCursor();
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) return;
          if ((cursor.value as Entry<unknown>).expiresAt <= now) cursor.delete();
          cursor.continue();
        };
      }
      await completed(transaction);
    },
  };
}

/**
 * The room store for this browser: IndexedDB when it opens, otherwise memory, so a room still
 * works in a private window that blocks storage (it just won't survive a refresh).
 */
export function createBrowserRoomStore(factory: IDBFactory | undefined): RoomStore {
  const chosen: Promise<RoomStore> = (async () => {
    if (!factory) return createMemoryRoomStore();
    try {
      const store = createIndexedDbRoomStore(factory);
      await store.ready();
      return store;
    } catch {
      return createMemoryRoomStore();
    }
  })();

  return {
    getRoom: async (roomId) => (await chosen).getRoom(roomId),
    saveRoom: async (record) => (await chosen).saveRoom(record),
    getHostKey: async (roomId) => (await chosen).getHostKey(roomId),
    saveHostKey: async (roomId, hostKey, expiresAt) =>
      (await chosen).saveHostKey(roomId, hostKey, expiresAt),
    getMembership: async (roomId) => (await chosen).getMembership(roomId),
    saveMembership: async (roomId, membership, expiresAt) =>
      (await chosen).saveMembership(roomId, membership, expiresAt),
    getVote: async (roomId) => (await chosen).getVote(roomId),
    saveVote: async (roomId, vote, expiresAt) => (await chosen).saveVote(roomId, vote, expiresAt),
    deleteVote: async (roomId) => (await chosen).deleteVote(roomId),
    deleteRoom: async (roomId) => (await chosen).deleteRoom(roomId),
    purgeExpired: async (now) => (await chosen).purgeExpired(now),
  };
}
