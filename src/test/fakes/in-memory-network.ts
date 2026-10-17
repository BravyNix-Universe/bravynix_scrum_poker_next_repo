import type {
  ConnectHandlers,
  Hub,
  HubHandlers,
  PeerLink,
  PeerTransport,
} from "@/application/ports/peer-transport";
import type { RoomId } from "@/domain/room/room-identity";

interface LinkEnd extends PeerLink {
  deliver(message: string): void;
  ended(): void;
}

interface RegisteredHub {
  handlers: HubHandlers;
  links: Set<LinkEnd>;
}

/** Later, in order: links and the service never answer synchronously, as in a browser. */
const later = (task: () => void) => void setTimeout(task, 0);

/**
 * A connection service and network in memory, for testing live sessions without WebRTC.
 * Each device gets its own transport; hubs, links and outages behave like PeerJS's.
 */
export function createInMemoryNetwork() {
  const hubs = new Map<RoomId, RegisteredHub>();
  let serviceUp = true;

  function linkPair(): [LinkEnd, LinkEnd] {
    const make = (): LinkEnd & { peer?: LinkEnd } => {
      const messageListeners: ((message: string) => void)[] = [];
      const closeListeners: (() => void)[] = [];
      let open = true;
      const end: LinkEnd & { peer?: LinkEnd } = {
        send(message) {
          if (!open) return;
          const peer = end.peer;
          later(() => peer?.deliver(message));
        },
        close() {
          if (!open) return;
          end.ended();
          end.peer?.ended();
        },
        onMessage: (listener) => void messageListeners.push(listener),
        onClose: (listener) => void closeListeners.push(listener),
        getPath: async () => "direct",
        deliver(message) {
          if (open) messageListeners.forEach((listener) => listener(message));
        },
        ended() {
          if (!open) return;
          open = false;
          later(() => closeListeners.forEach((listener) => listener()));
        },
      };
      return end;
    };
    const host = make();
    const client = make();
    host.peer = client;
    client.peer = host;
    return [host, client];
  }

  function transport(): PeerTransport {
    return {
      openHub(roomId, handlers): Hub {
        const entry: RegisteredHub = { handlers, links: new Set() };
        let closed = false;
        const register = () =>
          later(() => {
            if (closed) return;
            if (!serviceUp) return handlers.onFailure("service-unreachable");
            const holder = hubs.get(roomId);
            if (holder && holder !== entry) return handlers.onFailure("hub-taken");
            hubs.set(roomId, entry);
            handlers.onReady();
          });
        register();
        return {
          reconnect: register,
          close() {
            closed = true;
            if (hubs.get(roomId) === entry) hubs.delete(roomId);
            entry.links.forEach((link) => link.close());
          },
        };
      },

      connect(roomId, handlers: ConnectHandlers) {
        let cancelled = false;
        later(() => {
          if (cancelled) return;
          if (!serviceUp) return handlers.onFailure("service-unreachable");
          const hub = hubs.get(roomId);
          if (!hub) return handlers.onFailure("host-offline");
          const [hostEnd, clientEnd] = linkPair();
          hub.links.add(hostEnd);
          hostEnd.onClose(() => hub.links.delete(hostEnd));
          hub.handlers.onLink(hostEnd);
          handlers.onOpen(clientEnd);
        });
        return { cancel: () => void (cancelled = true) };
      },
    };
  }

  return {
    transport,
    /** Takes the connection service down or brings it back. Open links carry on. */
    setServiceUp(up: boolean) {
      serviceUp = up;
    },
    /** Cuts every link to a room's host, as a network drop would. */
    dropLinks(roomId: RoomId) {
      hubs.get(roomId)?.links.forEach((link) => link.close());
    },
    hasHub: (roomId: RoomId) => hubs.has(roomId),
  };
}
