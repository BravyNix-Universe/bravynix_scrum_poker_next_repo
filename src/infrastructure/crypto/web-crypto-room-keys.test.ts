// @vitest-environment node
import { describe, expect, it } from "vitest";

import { HOST_KEY_LENGTH, isEncodedHostKey, isRoomId } from "@/domain/room/room-identity";

import {
  decodeHostKey,
  deriveRoomId,
  encodeHostKey,
  generateHostKeyPair,
  webCryptoRoomKeys,
} from "./web-crypto-room-keys";

const SIGNATURE = { name: "ECDSA", hash: "SHA-256" } as const;

describe("Web Crypto room keys", () => {
  it("derives a stable 12-character base62 room ID from the public key", async () => {
    const { publicKey } = await generateHostKeyPair();
    const roomId = await deriveRoomId(publicKey);
    expect(isRoomId(roomId)).toBe(true);
    expect(await deriveRoomId(publicKey)).toBe(roomId);
  });

  it("gives different rooms different IDs (PRD 18.1.3)", async () => {
    const identities = await Promise.all(
      Array.from({ length: 5 }, () => webCryptoRoomKeys.createIdentity()),
    );
    expect(new Set(identities.map((identity) => identity.roomId)).size).toBe(identities.length);
    identities.forEach((identity) => expect(isEncodedHostKey(identity.hostKey)).toBe(true));
  });

  it("round-trips the host key so another device can host the same room", async () => {
    const original = await generateHostKeyPair();
    const encoded = await encodeHostKey(original.privateKey);
    expect(encoded).toHaveLength(HOST_KEY_LENGTH);

    const restored = await decodeHostKey(encoded);
    expect(await deriveRoomId(restored.publicKey)).toBe(await deriveRoomId(original.publicKey));

    const message = new TextEncoder().encode("nonce");
    const signature = await crypto.subtle.sign(SIGNATURE, restored.privateKey, message);
    expect(await crypto.subtle.verify(SIGNATURE, original.publicKey, signature, message)).toBe(
      true,
    );
  });
});
