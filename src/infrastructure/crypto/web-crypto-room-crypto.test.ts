// @vitest-environment node
import { describe, expect, it } from "vitest";

import { sealVote } from "@/application/live/vote-seal";
import type { ParticipantId, RoundId } from "@/domain/room/room";

import { webCryptoRoomCrypto as crypto } from "./web-crypto-room-crypto";
import { webCryptoRoomKeys } from "./web-crypto-room-keys";

describe("webCryptoRoomCrypto (SDD 13.1, ADR-06)", () => {
  it("proves the host holds the key its room ID was made from", async () => {
    const { roomId, hostKey } = await webCryptoRoomKeys.createIdentity();
    const other = await webCryptoRoomKeys.createIdentity();
    const keys = await crypto.loadHostKeys(hostKey);

    await expect(crypto.isRoomKey(roomId, keys.publicKey)).resolves.toBe(true);
    await expect(crypto.isRoomKey(other.roomId, keys.publicKey)).resolves.toBe(false);
    await expect(crypto.isRoomKey(roomId, "not-a-key")).resolves.toBe(false);
  });

  it("verifies only the exact text the host signed", async () => {
    const keys = await crypto.loadHostKeys((await webCryptoRoomKeys.createIdentity()).hostKey);
    const signature = await keys.sign("version 3");

    await expect(crypto.verify(keys.publicKey, "version 3", signature)).resolves.toBe(true);
    await expect(crypto.verify(keys.publicKey, "version 4", signature)).resolves.toBe(false);
    await expect(crypto.verify(keys.publicKey, "version 3", "AAAA")).resolves.toBe(false);
  });

  it("seals a vote to its round and voter, so a seal can't be reused (SDD 11.4)", async () => {
    const { roomId } = await webCryptoRoomKeys.createIdentity();
    const vote = {
      roomId,
      roundId: "r1" as RoundId,
      participantId: "p1" as ParticipantId,
      card: "5" as const,
      salt: crypto.randomToken(16),
    };
    const seal = await sealVote(crypto, vote);

    await expect(sealVote(crypto, vote)).resolves.toBe(seal);
    await expect(sealVote(crypto, { ...vote, card: "8" })).resolves.not.toBe(seal);
    await expect(sealVote(crypto, { ...vote, roundId: "r2" as RoundId })).resolves.not.toBe(seal);
    await expect(
      sealVote(crypto, { ...vote, participantId: "p2" as ParticipantId }),
    ).resolves.not.toBe(seal);
    expect(crypto.randomToken(16)).toMatch(/^[A-Za-z0-9_-]{22}$/);
  });
});
