import type { DataConnection, Peer, PeerError, PeerOptions } from "peerjs";

import type {
  Hub,
  LinkPath,
  PeerLink,
  PeerTransport,
  TransportFailure,
} from "@/application/ports/peer-transport";
import type { RoomId } from "@/domain/room/room-identity";

import { createFrameAssembler, toFrames } from "./message-frames";
import type { PeerServerOptions } from "./peer-server-config";

/**
 * PeerJS adapter (SDD `transport` module, ADR-03). The connection service only introduces
 * browsers; room messages then travel over an encrypted WebRTC data channel, directly or
 * through a relay. PeerJS loads only when a room opens, not on the landing page.
 */
const HUB_PREFIX = "bvx-";
/** How long to wait for the service, and then for a channel to the host (SDD 15). */
const CONNECT_TIMEOUT_MS = 15_000;
const SERVICE_ERRORS = new Set([
  "network",
  "server-error",
  "socket-error",
  "socket-closed",
  "ssl-unavailable",
]);

type PeerConstructor = typeof Peer;

function hubId(roomId: RoomId): string {
  return `${HUB_PREFIX}${roomId}`;
}

export function createPeerJsTransport(server: PeerServerOptions = {}): PeerTransport {
  // PeerJS never logs: messages carry room content (PRD 14.3).
  const options: PeerOptions = { ...server, debug: 0 };
  let loaded: Promise<PeerConstructor> | null = null;
  const loadPeer = () => (loaded ??= import("peerjs").then((module) => module.Peer));

  return {
    openHub(roomId, handlers): Hub {
      let peer: Peer | null = null;
      let closed = false;
      const links = new Set<PeerLink>();

      async function register(): Promise<void> {
        const PeerClass = await loadPeer().catch(() => null);
        if (closed) return;
        if (!PeerClass) return handlers.onFailure("service-unreachable");

        const created = new PeerClass(hubId(roomId), options);
        peer = created;
        let opened = false;
        const isCurrent = () => peer === created && !closed;
        const timeout = setTimeout(() => {
          if (!isCurrent() || opened) return;
          created.destroy();
          handlers.onFailure("service-unreachable");
        }, CONNECT_TIMEOUT_MS);

        created.on("open", () => {
          clearTimeout(timeout);
          opened = true;
          if (isCurrent()) handlers.onReady();
        });
        created.on("connection", (connection) => {
          if (!isCurrent()) return connection.close();
          connection.on("open", () => {
            const link = wrapConnection(connection);
            links.add(link);
            link.onClose(() => links.delete(link));
            handlers.onLink(link);
          });
        });
        created.on("disconnected", () => {
          if (isCurrent() && opened && !created.destroyed) handlers.onOffline();
        });
        created.on("error", (error: PeerError<string>) => {
          if (!isCurrent()) return;
          if (error.type === "unavailable-id") {
            clearTimeout(timeout);
            handlers.onFailure("hub-taken");
          } else if (error.type === "browser-incompatible") {
            clearTimeout(timeout);
            handlers.onFailure("unsupported");
          } else if (SERVICE_ERRORS.has(error.type) && !opened) {
            // Once open, losing the service is reported by "disconnected" instead.
            clearTimeout(timeout);
            handlers.onFailure("service-unreachable");
          }
        });
      }

      void register();

      return {
        reconnect() {
          if (closed) return;
          if (peer && !peer.destroyed) {
            if (peer.disconnected) peer.reconnect();
            return;
          }
          void register();
        },
        close() {
          closed = true;
          links.forEach((link) => link.close());
          links.clear();
          peer?.destroy();
          peer = null;
        },
      };
    },

    connect(roomId, handlers) {
      let peer: Peer | null = null;
      let settled = false;
      let cancelled = false;
      let serviceOpen = false;
      let timeout: ReturnType<typeof setTimeout> | null = null;

      const fail = (failure: TransportFailure) => {
        if (settled || cancelled) return;
        settled = true;
        if (timeout) clearTimeout(timeout);
        peer?.destroy();
        handlers.onFailure(failure);
      };

      void (async () => {
        const PeerClass = await loadPeer().catch(() => null);
        if (cancelled) return;
        if (!PeerClass) return fail("service-unreachable");

        // The service assigns this browser a random address; only the host's is known.
        const created = new PeerClass(options);
        peer = created;
        timeout = setTimeout(
          () => fail(serviceOpen ? "host-unreachable" : "service-unreachable"),
          CONNECT_TIMEOUT_MS,
        );
        created.on("open", () => {
          serviceOpen = true;
          const connection = created.connect(hubId(roomId), {
            reliable: true,
            serialization: "raw",
          });
          connection.on("open", () => {
            if (settled || cancelled) return;
            settled = true;
            if (timeout) clearTimeout(timeout);
            // The address is only needed while this link lasts.
            handlers.onOpen(wrapConnection(connection, () => created.destroy()));
          });
          connection.on("error", () => fail("host-unreachable"));
        });
        created.on("error", (error: PeerError<string>) => {
          if (error.type === "peer-unavailable") fail("host-offline");
          else if (error.type === "browser-incompatible") fail("unsupported");
          else if (SERVICE_ERRORS.has(error.type))
            fail(serviceOpen ? "host-unreachable" : "service-unreachable");
          else fail("host-unreachable");
        });
      })();

      return {
        cancel() {
          cancelled = true;
          if (timeout) clearTimeout(timeout);
          if (!settled) peer?.destroy();
        },
      };
    },
  };
}

/** Text messages over one data connection, framed so any size gets through. */
function wrapConnection(connection: DataConnection, release?: () => void): PeerLink {
  const messageListeners: ((message: string) => void)[] = [];
  const closeListeners: (() => void)[] = [];
  const assembler = createFrameAssembler();
  let closed = false;

  const finish = () => {
    if (closed) return;
    closed = true;
    release?.();
    closeListeners.forEach((listener) => listener());
  };

  connection.on("data", (data) => {
    if (closed || typeof data !== "string") return;
    const message = assembler.push(data);
    if (message !== null) messageListeners.forEach((listener) => listener(message));
  });
  connection.on("close", finish);
  connection.on("error", () => {
    connection.close();
    finish();
  });

  return {
    send(message) {
      if (closed) return;
      for (const frame of toFrames(message)) void connection.send(frame);
    },
    close() {
      if (closed) return;
      connection.close();
      finish();
    },
    onMessage: (listener) => void messageListeners.push(listener),
    onClose: (listener) => void closeListeners.push(listener),
    getPath: () => pathOf(connection.peerConnection),
  };
}

/** Whether the selected network path goes through a relay (TURN) server. */
async function pathOf(connection: RTCPeerConnection | null | undefined): Promise<LinkPath | null> {
  if (!connection) return null;
  const stats = await connection.getStats();
  let pair: RTCIceCandidatePairStats | undefined;
  stats.forEach((report: { type: string; selectedCandidatePairId?: string }) => {
    if (report.type === "transport" && report.selectedCandidatePairId) {
      pair = stats.get(report.selectedCandidatePairId) as RTCIceCandidatePairStats | undefined;
    }
  });
  if (!pair) {
    stats.forEach((report: RTCIceCandidatePairStats & { selected?: boolean }) => {
      if (report.type === "candidate-pair" && (report.selected || report.nominated))
        pair ??= report;
    });
  }
  if (!pair) return null;
  const local = stats.get(pair.localCandidateId) as { candidateType?: string } | undefined;
  const remote = stats.get(pair.remoteCandidateId) as { candidateType?: string } | undefined;
  return local?.candidateType === "relay" || remote?.candidateType === "relay"
    ? "relayed"
    : "direct";
}
