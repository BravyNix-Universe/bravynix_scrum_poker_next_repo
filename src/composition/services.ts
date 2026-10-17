import { createHostRoomSession } from "@/application/live/host-room-session";
import type { LiveSessionDependencies } from "@/application/live/live-session-dependencies";
import { createParticipantRoomSession } from "@/application/live/participant-room-session";
import type { MyRoomsRepository } from "@/application/ports/my-rooms-repository";
import type { PeerTransport } from "@/application/ports/peer-transport";
import type { ProfilePreferences } from "@/application/ports/profile-preferences";
import type { OpenRoomSession } from "@/application/ports/room-session";
import type { RoomStore } from "@/application/ports/room-store";
import { type ChangeProfile, makeChangeProfile } from "@/application/room/change-profile";
import { type CreateRoom, makeCreateRoom } from "@/application/room/create-room";
import { type ForgetRoom, makeForgetRoom } from "@/application/room/forget-room";
import { type JoinRoom, makeJoinRoom } from "@/application/room/join-room";
import { makeResolveRoomRole, type ResolveRoomRole } from "@/application/room/resolve-room-role";
import { webCryptoRoomCrypto } from "@/infrastructure/crypto/web-crypto-room-crypto";
import { webCryptoRoomKeys } from "@/infrastructure/crypto/web-crypto-room-keys";
import { createPreviewRoomSession } from "@/infrastructure/preview/preview-room-session";
import { getBrowserStorage } from "@/infrastructure/storage/browser-storage";
import { createBrowserRoomStore } from "@/infrastructure/storage/indexed-db-room-store";
import { createLocalMyRoomsRepository } from "@/infrastructure/storage/local-my-rooms-repository";
import { createLocalProfilePreferences } from "@/infrastructure/storage/local-profile-preferences";
import { toPeerServerOptions } from "@/infrastructure/transport/peer-server-config";
import { createPeerJsTransport } from "@/infrastructure/transport/peerjs-transport";

/**
 * Composition root: the one place that picks concrete adapters for the application's ports.
 * Services are built lazily on first use, so call these only in the browser (effects and
 * event handlers), never during server rendering.
 */
const now = () => Date.now();

/**
 * `NEXT_PUBLIC_ROOM_MODE=preview` runs rooms in this tab with simulated teammates, for
 * reviewing screens without a network. Otherwise rooms are live, peer to peer.
 */
export const IS_PREVIEW_SESSION = process.env.NEXT_PUBLIC_ROOM_MODE === "preview";

let myRooms: MyRoomsRepository | null = null;
let preferences: ProfilePreferences | null = null;
let roomStore: RoomStore | null = null;
let peerTransport: PeerTransport | null = null;
let createRoom: CreateRoom | null = null;
let joinRoom: JoinRoom | null = null;
let changeProfile: ChangeProfile | null = null;
let resolveRoomRole: ResolveRoomRole | null = null;
let forgetRoom: ForgetRoom | null = null;

export function getMyRoomsRepository(): MyRoomsRepository {
  if (!myRooms) {
    myRooms = createLocalMyRoomsRepository(getBrowserStorage());
    getRoomStore();
  }
  return myRooms;
}

export function getProfilePreferences(): ProfilePreferences {
  preferences ??= createLocalProfilePreferences(getBrowserStorage());
  return preferences;
}

/** Room records, keys, identities and votes. Expired rooms are deleted on every page load. */
export function getRoomStore(): RoomStore {
  if (!roomStore) {
    roomStore = createBrowserRoomStore(globalThis.indexedDB);
    void roomStore.purgeExpired(now()).catch(() => undefined);
  }
  return roomStore;
}

function getPeerTransport(): PeerTransport {
  // `process.env.NEXT_PUBLIC_*` must be written out in full to be filled in at build time.
  peerTransport ??= createPeerJsTransport(
    toPeerServerOptions({
      host: process.env.NEXT_PUBLIC_PEER_HOST,
      port: process.env.NEXT_PUBLIC_PEER_PORT,
      path: process.env.NEXT_PUBLIC_PEER_PATH,
      secure: process.env.NEXT_PUBLIC_PEER_SECURE,
    }),
  );
  return peerTransport;
}

export function getCreateRoom(): CreateRoom {
  createRoom ??= makeCreateRoom({
    roomKeys: webCryptoRoomKeys,
    store: getRoomStore(),
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
  resolveRoomRole ??= makeResolveRoomRole({
    store: getRoomStore(),
    crypto: webCryptoRoomCrypto,
    now,
  });
  return resolveRoomRole;
}

export function getForgetRoom(): ForgetRoom {
  forgetRoom ??= makeForgetRoom({ myRooms: getMyRoomsRepository(), store: getRoomStore() });
  return forgetRoom;
}

/** A live room session for this device's role, or the in-tab preview. */
export const openRoomSession: OpenRoomSession = (request) => {
  if (IS_PREVIEW_SESSION) {
    return createPreviewRoomSession({
      ...request,
      listed:
        getMyRoomsRepository()
          .list(now())
          .find((room) => room.roomId === request.roomId) ?? null,
      now,
    });
  }
  const dependencies: LiveSessionDependencies = {
    roomId: request.roomId,
    store: getRoomStore(),
    crypto: webCryptoRoomCrypto,
    transport: getPeerTransport(),
    myRooms: getMyRoomsRepository(),
    now,
  };
  return request.role === "host"
    ? createHostRoomSession(dependencies)
    : createParticipantRoomSession(dependencies);
};
