import type { EncodedHostKey, RoomId } from "@/domain/room/room-identity";

/** The host's key pair, rebuilt from the host key this device holds (SDD 13.1, ADR-06). */
export interface HostKeys {
  /** The raw public key in base64url. Its SHA-256 digest gives the room ID. */
  publicKey: string;
  /** Signs text with the private key; the signature is base64url. */
  sign(payload: string): Promise<string>;
}

/**
 * The cryptography a live room needs (SDD `crypto` module): host proofs and signed state,
 * sealed votes, and random tokens. Every value crosses this port as base64url text.
 */
export interface RoomCrypto {
  loadHostKeys(hostKey: EncodedHostKey): Promise<HostKeys>;
  /** True when `publicKey` belongs to the room, because the room ID is derived from it. */
  isRoomKey(roomId: RoomId, publicKey: string): Promise<boolean>;
  /** False for a bad signature, and for a malformed key or signature. */
  verify(publicKey: string, payload: string, signature: string): Promise<boolean>;
  /** The SHA-256 digest of the text. */
  digest(payload: string): Promise<string>;
  /** `bytes` cryptographically random bytes. */
  randomToken(bytes: number): string;
}
