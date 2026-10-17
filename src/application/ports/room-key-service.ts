import type { EncodedHostKey, RoomId } from "@/domain/room/room-identity";

/** A new room's identity: the ID everyone uses and the host's secret key. */
export interface RoomIdentity {
  roomId: RoomId;
  hostKey: EncodedHostKey;
}

/** Creates host key pairs and derives their room IDs (SDD `crypto` module, ADR-06). */
export interface RoomKeyService {
  createIdentity(): Promise<RoomIdentity>;
}

/** The platform can't do the required cryptography, for example outside https. */
export class SecureContextRequiredError extends Error {
  constructor() {
    super("Web Crypto is unavailable. A secure context (https or localhost) is required.");
    this.name = "SecureContextRequiredError";
  }
}
