import type { MyRoomsRepository } from "@/application/ports/my-rooms-repository";
import type { ProfilePreferences } from "@/application/ports/profile-preferences";
import type { OpenRoomSession } from "@/application/ports/room-session";
import { type ChangeProfile, makeChangeProfile } from "@/application/room/change-profile";
import { type CreateRoom, makeCreateRoom } from "@/application/room/create-room";
import { type JoinRoom, makeJoinRoom } from "@/application/room/join-room";
import { makeResolveRoomRole, type ResolveRoomRole } from "@/application/room/resolve-room-role";
import { webCryptoRoomKeys } from "@/infrastructure/crypto/web-crypto-room-keys";
import { createPreviewRoomSession } from "@/infrastructure/preview/preview-room-session";
import { getBrowserStorage } from "@/infrastructure/storage/browser-storage";
import { createLocalMyRoomsRepository } from "@/infrastructure/storage/local-my-rooms-repository";
import { createLocalProfilePreferences } from "@/infrastructure/storage/local-profile-preferences";

/**
 * Composition root: the one place that picks concrete adapters for the application's ports.
 * Services are built lazily on first use, so call these only in the browser (effects and
 * event handlers), never during server rendering.
 */
const now = () => Date.now();

let myRooms: MyRoomsRepository | null = null;
let preferences: ProfilePreferences | null = null;
let createRoom: CreateRoom | null = null;
let joinRoom: JoinRoom | null = null;
let changeProfile: ChangeProfile | null = null;
let resolveRoomRole: ResolveRoomRole | null = null;

export function getMyRoomsRepository(): MyRoomsRepository {
  myRooms ??= createLocalMyRoomsRepository(getBrowserStorage());
  return myRooms;
}

export function getProfilePreferences(): ProfilePreferences {
  preferences ??= createLocalProfilePreferences(getBrowserStorage());
  return preferences;
}

export function getCreateRoom(): CreateRoom {
  createRoom ??= makeCreateRoom({
    roomKeys: webCryptoRoomKeys,
    myRooms: getMyRoomsRepository(),
    now,
  });
  return createRoom;
}

export function getJoinRoom(): JoinRoom {
  joinRoom ??= makeJoinRoom({
    myRooms: getMyRoomsRepository(),
    preferences: getProfilePreferences(),
    now,
  });
  return joinRoom;
}

export function getChangeProfile(): ChangeProfile {
  changeProfile ??= makeChangeProfile({ preferences: getProfilePreferences() });
  return changeProfile;
}

export function getResolveRoomRole(): ResolveRoomRole {
  resolveRoomRole ??= makeResolveRoomRole({ myRooms: getMyRoomsRepository(), now });
  return resolveRoomRole;
}

/**
 * Rooms run on the in-tab preview session with simulated teammates until the peer-to-peer
 * session (PeerJS, IndexedDB) replaces it in Phase 5. Only this function changes then.
 */
export const openRoomSession: OpenRoomSession = (request) =>
  createPreviewRoomSession({
    ...request,
    listed:
      getMyRoomsRepository()
        .list(now())
        .find((room) => room.roomId === request.roomId) ?? null,
    now,
  });

/** True while rooms run on the preview session, so the UI can say so. */
export const IS_PREVIEW_SESSION = true;
