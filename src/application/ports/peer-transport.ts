import type { RoomId } from "@/domain/room/room-identity";

/**
 * Why a connection couldn't be made (PRD 8.5, SDD 15). `hub-taken` means another tab or
 * device already hosts the room; `host-offline` means nobody does right now.
 */
export type TransportFailure =
  "service-unreachable" | "hub-taken" | "host-offline" | "host-unreachable" | "unsupported";

/** How a link's messages travel: straight between the browsers, or through a relay server. */
export type LinkPath = "direct" | "relayed";

/** One reliable, ordered channel between a participant's browser and the host's (SDD 12). */
export interface PeerLink {
  /** Sends one message, as text. Large messages are split and rejoined by the transport. */
  send(message: string): void;
  close(): void;
  onMessage(listener: (message: string) => void): void;
  /** Called once, whichever side closed the link or if it failed. */
  onClose(listener: () => void): void;
  getPath(): Promise<LinkPath | null>;
}

export interface HubHandlers {
  /** The room's address is registered: participants can connect. */
  onReady(): void;
  onLink(link: PeerLink): void;
  /** The hub couldn't open. It stays closed until `reconnect`. */
  onFailure(
    failure: Extract<TransportFailure, "service-unreachable" | "hub-taken" | "unsupported">,
  ): void;
  /** The connection service dropped. Open links carry on; new participants can't connect. */
  onOffline(): void;
}

/** The host's side of a room: one address everyone in the room connects to (SDD ADR-02). */
export interface Hub {
  /** Registers again after a failure or after going offline. */
  reconnect(): void;
  /** Closes every link and releases the room's address. */
  close(): void;
}

export interface ConnectHandlers {
  onOpen(link: PeerLink): void;
  onFailure(failure: TransportFailure): void;
}

export interface PendingConnection {
  cancel(): void;
}

/** Finds the room's host through the connection service (SDD `transport` module, ADR-03). */
export interface PeerTransport {
  openHub(roomId: RoomId, handlers: HubHandlers): Hub;
  connect(roomId: RoomId, handlers: ConnectHandlers): PendingConnection;
}
