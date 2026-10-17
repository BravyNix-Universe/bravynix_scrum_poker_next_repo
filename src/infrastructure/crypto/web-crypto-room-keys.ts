import {
  type RoomKeyService,
  SecureContextRequiredError,
} from "@/application/ports/room-key-service";
import {
  type EncodedHostKey,
  HOST_KEY_BYTES,
  type RoomId,
  roomIdFromDigest,
} from "@/domain/room/room-identity";
import { fromBase64Url, toBase64Url } from "@/domain/shared/encoding";

/** Web Crypto adapter for host keys and room IDs (SDD `crypto` module, ADR-06). */
const KEY_ALGORITHM = { name: "ECDSA", namedCurve: "P-256" } as const;
const COORDINATE_BYTES = HOST_KEY_BYTES / 3;

function subtle(): SubtleCrypto {
  const api = globalThis.crypto?.subtle;
  if (!api) throw new SecureContextRequiredError();
  return api;
}

export function generateHostKeyPair(): Promise<CryptoKeyPair> {
  return subtle().generateKey(KEY_ALGORITHM, true, ["sign", "verify"]);
}

export async function deriveRoomId(publicKey: CryptoKey): Promise<RoomId> {
  const raw = await subtle().exportKey("raw", publicKey);
  return roomIdFromDigest(new Uint8Array(await subtle().digest("SHA-256", raw)));
}

/** Encodes the private key as base64url(d ‖ x ‖ y), 128 characters. */
export async function encodeHostKey(privateKey: CryptoKey): Promise<EncodedHostKey> {
  const jwk = await subtle().exportKey("jwk", privateKey);
  if (!jwk.d || !jwk.x || !jwk.y) throw new Error("Host key is missing JWK components");
  const bytes = new Uint8Array(HOST_KEY_BYTES);
  [jwk.d, jwk.x, jwk.y].forEach((part, index) => {
    const decoded = fromBase64Url(part);
    if (decoded.length !== COORDINATE_BYTES) throw new Error("Unexpected P-256 key size");
    bytes.set(decoded, index * COORDINATE_BYTES);
  });
  return toBase64Url(bytes) as EncodedHostKey;
}

/** Rebuilds the host key pair from the host link, for example on another device. */
export async function decodeHostKey(encoded: EncodedHostKey): Promise<CryptoKeyPair> {
  const bytes = fromBase64Url(encoded);
  if (bytes.length !== HOST_KEY_BYTES) throw new Error("Invalid host key length");
  const part = (index: number) =>
    toBase64Url(bytes.slice(index * COORDINATE_BYTES, (index + 1) * COORDINATE_BYTES));
  const publicJwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    x: part(1),
    y: part(2),
    ext: true,
  };
  const privateJwk: JsonWebKey = { ...publicJwk, d: part(0) };
  const [privateKey, publicKey] = await Promise.all([
    subtle().importKey("jwk", privateJwk, KEY_ALGORITHM, true, ["sign"]),
    subtle().importKey("jwk", publicJwk, KEY_ALGORITHM, true, ["verify"]),
  ]);
  return { privateKey, publicKey };
}

export const webCryptoRoomKeys: RoomKeyService = {
  async createIdentity() {
    const keyPair = await generateHostKeyPair();
    const [roomId, hostKey] = await Promise.all([
      deriveRoomId(keyPair.publicKey),
      encodeHostKey(keyPair.privateKey),
    ]);
    return { roomId, hostKey };
  },
};
