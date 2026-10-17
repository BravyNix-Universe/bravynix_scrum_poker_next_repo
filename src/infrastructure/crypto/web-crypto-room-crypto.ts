import type { RoomCrypto } from "@/application/ports/room-crypto";
import { SecureContextRequiredError } from "@/application/ports/room-key-service";
import { roomIdFromDigest } from "@/domain/room/room-identity";
import { fromBase64Url, toBase64Url } from "@/domain/shared/encoding";

import { decodeHostKey } from "./web-crypto-room-keys";

/** Web Crypto adapter for signatures, digests and random tokens (SDD `crypto` module). */
const SIGNATURE = { name: "ECDSA", hash: "SHA-256" } as const;
const KEY_ALGORITHM = { name: "ECDSA", namedCurve: "P-256" } as const;
/** An uncompressed P-256 public key: 0x04 ‖ x ‖ y. */
const RAW_PUBLIC_KEY_BYTES = 65;

function webCrypto(): Crypto {
  const api = globalThis.crypto;
  if (!api?.subtle) throw new SecureContextRequiredError();
  return api;
}

const encoder = new TextEncoder();
const bytesOf = (text: string) => encoder.encode(text);

/** Copies into a fresh ArrayBuffer, the type Web Crypto's signatures accept. */
function buffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer as ArrayBuffer;
}

/** Imported verification keys, by encoded public key. A room has one, so this stays tiny. */
const publicKeys = new Map<string, Promise<CryptoKey>>();

function importPublicKey(publicKey: string): Promise<CryptoKey> {
  let key = publicKeys.get(publicKey);
  if (!key) {
    key = webCrypto().subtle.importKey(
      "raw",
      buffer(fromBase64Url(publicKey)),
      KEY_ALGORITHM,
      false,
      ["verify"],
    );
    key.catch(() => publicKeys.delete(publicKey));
    publicKeys.set(publicKey, key);
  }
  return key;
}

async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await webCrypto().subtle.digest("SHA-256", buffer(bytes)));
}

export const webCryptoRoomCrypto: RoomCrypto = {
  async loadHostKeys(hostKey) {
    const { privateKey, publicKey } = await decodeHostKey(hostKey);
    const raw = new Uint8Array(await webCrypto().subtle.exportKey("raw", publicKey));
    return {
      publicKey: toBase64Url(raw),
      async sign(payload) {
        const signature = await webCrypto().subtle.sign(SIGNATURE, privateKey, bytesOf(payload));
        return toBase64Url(new Uint8Array(signature));
      },
    };
  },

  async isRoomKey(roomId, publicKey) {
    try {
      const raw = fromBase64Url(publicKey);
      return raw.length === RAW_PUBLIC_KEY_BYTES && roomIdFromDigest(await sha256(raw)) === roomId;
    } catch {
      return false;
    }
  },

  async verify(publicKey, payload, signature) {
    try {
      const key = await importPublicKey(publicKey);
      return await webCrypto().subtle.verify(
        SIGNATURE,
        key,
        buffer(fromBase64Url(signature)),
        bytesOf(payload),
      );
    } catch {
      return false;
    }
  },

  async digest(payload) {
    return toBase64Url(await sha256(bytesOf(payload)));
  },

  randomToken(bytes) {
    return toBase64Url(webCrypto().getRandomValues(new Uint8Array(bytes)));
  },
};
