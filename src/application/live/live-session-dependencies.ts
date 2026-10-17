import type { RoomId } from "@/domain/room/room-identity";

import type { LiveTiming } from "./live-timing";
import type { MyRoomsRepository } from "../ports/my-rooms-repository";
import type { PeerTransport } from "../ports/peer-transport";
import type { RoomCrypto } from "../ports/room-crypto";
import type { RoomStore } from "../ports/room-store";

/** What a live room session needs from the outside world, as ports. */
export interface LiveSessionDependencies {
  roomId: RoomId;
  store: RoomStore;
  crypto: RoomCrypto;
  transport: PeerTransport;
  myRooms: MyRoomsRepository;
  now: () => number;
  timing?: LiveTiming;
}
