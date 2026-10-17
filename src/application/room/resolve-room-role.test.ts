// @vitest-environment node
import { describe, expect, it } from "vitest";

import type { EncodedHostKey } from "@/domain/room/room-identity";
import { webCryptoRoomCrypto } from "@/infrastructure/crypto/web-crypto-room-crypto";
import { webCryptoRoomKeys } from "@/infrastructure/crypto/web-crypto-room-keys";
import { createMemoryRoomStore } from "@/infrastructure/storage/memory-room-store";

import { makeResolveRoomRole } from "./resolve-room-role";

const NOW = Date.UTC(2026, 9, 17, 6, 0, 0);

async function setup() {
  const store = createMemoryRoomStore();
  const identity = await webCryptoRoomKeys.createIdentity();
  const resolveRole = makeResolveRoomRole({ store, crypto: webCryptoRoomCrypto, now: () => NOW });
  return { store, resolveRole, ...identity };
}

describe("resolveRoomRole (PRD FR-045, SDD 11.6)", () => {
  it("hosts from the host link and keeps the key, so the link can leave the address bar", async () => {
    const { store, resolveRole, roomId, hostKey } = await setup();

    await expect(resolveRole({ roomId, hostKey })).resolves.toBe("host");
    await expect(store.getHostKey(roomId)).resolves.toBe(hostKey);
    // Opened again without the key, the device still hosts.
    await expect(resolveRole({ roomId, hostKey: null })).resolves.toBe("host");
  });

  it("joins as a participant without the room's key", async () => {
    const { resolveRole, roomId } = await setup();
    await expect(resolveRole({ roomId, hostKey: null })).resolves.toBe("participant");
  });

  it("ignores a host key that belongs to another room", async () => {
    const { store, resolveRole, roomId } = await setup();
    const other = await webCryptoRoomKeys.createIdentity();

    await expect(resolveRole({ roomId, hostKey: other.hostKey })).resolves.toBe("participant");
    await expect(resolveRole({ roomId, hostKey: "A".repeat(128) as EncodedHostKey })).resolves.toBe(
      "participant",
    );
    await expect(store.getHostKey(roomId)).resolves.toBeNull();
  });
});
