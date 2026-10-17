import { bytesToBigInt, toBase62 } from "@/domain/shared/encoding";

/**
 * Room identity formats (PRD FR-002, SDD ADR-06). The host's browser creates an ECDSA P-256 key
 * pair; the room ID is derived from the public key so participants can check that whoever answers
 * for a room holds its key. The private key travels only in the host link, after `#`.
 */
export const ROOM_ID_LENGTH = 12;

/** The host key is the P-256 private scalar and public point, d ‖ x ‖ y, 32 bytes each. */
export const HOST_KEY_BYTES = 96;
export const HOST_KEY_LENGTH = Math.ceil((HOST_KEY_BYTES * 4) / 3);

const ROOM_ID_SPACE = 62n ** BigInt(ROOM_ID_LENGTH);
const ROOM_ID_PATTERN = new RegExp(`^[0-9A-Za-z]{${ROOM_ID_LENGTH}}$`);
const HOST_KEY_PATTERN = new RegExp(`^[A-Za-z0-9_-]{${HOST_KEY_LENGTH}}$`);

/** A 12-character base62 room ID, about 71 bits. */
export type RoomId = string & { readonly __brand: "RoomId" };

/** The host's private key, encoded for the host link. Treat as a secret. */
export type EncodedHostKey = string & { readonly __brand: "EncodedHostKey" };

export function isRoomId(value: string): value is RoomId {
  return ROOM_ID_PATTERN.test(value);
}

export function isEncodedHostKey(value: string): value is EncodedHostKey {
  return HOST_KEY_PATTERN.test(value);
}

/** Room ID = SHA-256 digest of the raw public key, reduced to 12 base62 characters. */
export function roomIdFromDigest(digest: Uint8Array): RoomId {
  return toBase62(bytesToBigInt(digest) % ROOM_ID_SPACE, ROOM_ID_LENGTH) as RoomId;
}
