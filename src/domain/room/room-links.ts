import {
  type EncodedHostKey,
  isEncodedHostKey,
  isRoomId,
  type RoomId,
} from "@/domain/room/room-identity";

/**
 * Room links keep the room ID and host key after `#`, which browsers never send to a server,
 * so neither appears in hosting logs (PRD D-04, 14.1).
 *
 *   participant: https://poker.bravynix.com/r/#<roomId>
 *   host:        https://poker.bravynix.com/r/#<roomId>&h=<hostKey>
 */
export const ROOM_PATH = "/r/";
const HOST_KEY_PARAM = "h";

export interface RoomFragment {
  roomId: RoomId;
  hostKey: EncodedHostKey | null;
}

export function buildParticipantLink(origin: string, roomId: RoomId): string {
  return `${trimTrailingSlash(origin)}${ROOM_PATH}#${roomId}`;
}

export function buildHostLink(origin: string, roomId: RoomId, hostKey: EncodedHostKey): string {
  return `${buildParticipantLink(origin, roomId)}&${HOST_KEY_PARAM}=${hostKey}`;
}

/** Parses `location.hash`. Returns null for anything that isn't a well-formed room link. */
export function parseRoomFragment(hash: string): RoomFragment | null {
  const [roomId, ...params] = hash.replace(/^#/, "").split("&");
  if (!roomId || !isRoomId(roomId)) return null;

  let hostKey: EncodedHostKey | null = null;
  for (const param of params) {
    const [name, value = ""] = param.split("=", 2);
    if (name !== HOST_KEY_PARAM) continue;
    if (!isEncodedHostKey(value)) return null;
    hostKey = value;
  }
  return { roomId, hostKey };
}

/** Masks a secret link for display, keeping only its last characters (screen-share safety). */
export function maskHostLink(link: string, visible = 4): string {
  const separator = link.lastIndexOf(`${HOST_KEY_PARAM}=`);
  if (separator === -1) return link;
  const start = separator + HOST_KEY_PARAM.length + 1;
  return `${link.slice(0, start)}••••${link.slice(-visible)}`;
}

/** Drops the protocol so the meaningful end of a link fits on small screens. */
export function formatLinkForDisplay(link: string): string {
  return link.replace(/^https?:\/\//, "");
}

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
