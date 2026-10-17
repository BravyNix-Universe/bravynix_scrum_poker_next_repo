// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import type { PeerLink } from "@/application/ports/peer-transport";
import type { RoomSession } from "@/application/ports/room-session";
import type { HostRoomRecord, RoomStore } from "@/application/ports/room-store";
import { encodeMessage, type HostMessage } from "@/application/protocol/messages";
import { makeCreateRoom } from "@/application/room/create-room";
import type { RoomSessionState } from "@/application/room/room-session-state";
import type { RoomView } from "@/application/room/room-view";
import { challengePayload } from "@/application/sync/signed-state";
import { PROTOCOL_VERSION } from "@/domain/protocol/version";
import type { RoomId } from "@/domain/room/room-identity";
import { webCryptoRoomCrypto } from "@/infrastructure/crypto/web-crypto-room-crypto";
import { webCryptoRoomKeys } from "@/infrastructure/crypto/web-crypto-room-keys";
import { createMemoryRoomStore } from "@/infrastructure/storage/memory-room-store";
import { createInMemoryMyRoomsRepository } from "@/test/fakes/in-memory-my-rooms-repository";
import { createInMemoryNetwork } from "@/test/fakes/in-memory-network";

import { createHostRoomSession } from "./host-room-session";
import type { LiveTiming } from "./live-timing";
import { createParticipantRoomSession } from "./participant-room-session";

const TIMING: LiveTiming = {
  heartbeatMs: 50,
  silenceLimitMs: 2_000,
  welcomeTimeoutMs: 1_000,
  hubRetries: 1,
  hubRetryDelayMs: 20,
  revealDeadlineMs: 400,
  reconnectDelayMs: () => 20,
};

const PRIYA = { displayName: "Priya", avatarId: null };
const ANA = { displayName: "Ana", avatarId: null };

const open = new Set<RoomSession>();
afterEach(() => {
  open.forEach((session) => session.close());
  open.clear();
});

type Network = ReturnType<typeof createInMemoryNetwork>;

/** One browser: its own storage, sharing the network with everyone else. */
function device(network: Network, store: RoomStore = createMemoryRoomStore()) {
  const myRooms = createInMemoryMyRoomsRepository();
  const deps = (roomId: RoomId) => ({
    roomId,
    store,
    crypto: webCryptoRoomCrypto,
    transport: network.transport(),
    myRooms,
    now: () => Date.now(),
    timing: TIMING,
  });
  const track = (session: RoomSession) => {
    open.add(session);
    return session;
  };
  return {
    store,
    myRooms,
    host: (roomId: RoomId) => track(createHostRoomSession(deps(roomId))),
    participant: (roomId: RoomId) => track(createParticipantRoomSession(deps(roomId))),
  };
}

async function until(session: RoomSession, check: (state: RoomSessionState) => boolean) {
  await vi.waitFor(
    () => {
      if (!check(session.getState())) throw new Error(`Still ${session.getState().status}`);
    },
    { timeout: 4_000, interval: 5 },
  );
}

function viewOf(session: RoomSession): RoomView {
  const state = session.getState();
  if (state.status !== "joined") throw new Error(`Not joined: ${state.status}`);
  return state.view;
}

const joined = (state: RoomSessionState) => state.status === "joined";
const connected = (state: RoomSessionState) =>
  state.status === "joined" && state.connection === "connected";
const viewMatches = (check: (view: RoomView) => boolean) => (state: RoomSessionState) =>
  state.status === "joined" && check(state.view);

/** A host who created a room on its device and joined it, with one story added. */
async function hostedRoom(network: Network) {
  const hostDevice = device(network);
  const createRoom = makeCreateRoom({
    roomKeys: webCryptoRoomKeys,
    store: hostDevice.store,
    myRooms: hostDevice.myRooms,
    now: () => Date.now(),
  });
  const { roomId, hostKey } = await createRoom("Checkout revamp");
  const host = hostDevice.host(roomId);
  await until(host, (state) => state.status === "lobby");
  await host.join(PRIYA);
  host.addStory("Saved cards");
  await until(
    host,
    viewMatches((view) => view.stories.length === 1),
  );
  return { roomId, hostKey, host, hostDevice };
}

async function joinAsAna(network: Network, roomId: RoomId, anaDevice = device(network)) {
  const ana = anaDevice.participant(roomId);
  await until(ana, (state) => state.status === "lobby");
  await ana.join(ANA);
  await until(ana, connected);
  return { ana, anaDevice };
}

describe("live rooms (SDD 11, 12)", () => {
  it("lets a participant check the host, join, and follow the room (SDD 11.3)", async () => {
    const network = createInMemoryNetwork();
    const { roomId, host } = await hostedRoom(network);
    const ana = device(network).participant(roomId);

    await until(ana, (state) => state.status === "lobby");
    const lobby = ana.getState();
    expect(lobby).toMatchObject({ lobby: { epicTitle: "Checkout revamp", role: "participant" } });

    await ana.join(ANA);
    await until(ana, connected);
    expect(viewOf(ana).stories.map((story) => story.title)).toEqual(["Saved cards"]);
    expect(ana.getDiagnostics()).toMatchObject({ state: "connected", path: "direct" });
    await until(
      host,
      viewMatches((view) => view.participants.some((p) => p.displayName === "Ana")),
    );

    host.addStory("Guest checkout");
    await until(
      ana,
      viewMatches((view) => view.stories.length === 2),
    );
  });

  it("keeps votes sealed until reveal, then counts every opened vote (PRD 11.4, 14.2)", async () => {
    const network = createInMemoryNetwork();
    const { roomId, host, hostDevice } = await hostedRoom(network);
    const { ana, anaDevice } = await joinAsAna(network, roomId);

    host.startRound();
    await until(
      ana,
      viewMatches((view) => view.round?.status === "voting"),
    );
    ana.castVote("5");
    const anaId = viewOf(ana).me;
    await until(
      host,
      viewMatches((view) => view.round?.votedIds.includes(anaId) ?? false),
    );
    expect(viewOf(ana).myVote).toBe("5");

    // The host's record holds a fingerprint, never the card.
    const record = (await hostDevice.store.getRoom(roomId)) as HostRoomRecord;
    expect(record.state.seals).toEqual([{ participantId: anaId, seal: expect.any(String) }]);
    expect(JSON.stringify(record)).not.toContain('"card"');
    expect(viewOf(host).round?.outcome).toBeNull();

    host.castVote("8");
    await until(
      host,
      viewMatches((view) => view.myVote === "8"),
    );
    host.reveal();
    await until(
      ana,
      viewMatches((view) => view.round?.status === "revealed"),
    );

    const votes = viewOf(ana).round?.outcome?.votes.map((vote) => [vote.displayName, vote.card]);
    expect(votes).toEqual([
      ["Priya", "8"],
      ["Ana", "5"],
    ]);
    // The card and salt leave the voter's device once the round is revealed (SDD 10).
    await vi.waitFor(async () => expect(await anaDevice.store.getVote(roomId)).toBeNull());
  });

  it("refuses a change that arrives after voting closed; the earlier vote still opens (PRD 18.5.4)", async () => {
    const network = createInMemoryNetwork();
    const { roomId, host } = await hostedRoom(network);
    const { ana } = await joinAsAna(network, roomId);
    const anaId = viewOf(ana).me;

    host.startRound();
    await until(
      ana,
      viewMatches((view) => view.round?.status === "voting"),
    );
    ana.castVote("3");
    await until(
      host,
      viewMatches((view) => view.round?.votedIds.includes(anaId) ?? false),
    );

    ana.castVote("13");
    host.reveal();

    await until(
      ana,
      (state) => state.status === "joined" && state.notice?.refusal === "round-closed",
    );
    await until(
      ana,
      viewMatches((view) => view.round?.status === "revealed"),
    );
    expect(viewOf(ana).round?.outcome?.votes.map((vote) => vote.card)).toEqual(["3"]);
  });

  it("recognises a participant after a refresh, without a duplicate (FR-006)", async () => {
    const network = createInMemoryNetwork();
    const { roomId, host } = await hostedRoom(network);
    const { ana, anaDevice } = await joinAsAna(network, roomId);
    ana.close();
    await until(
      host,
      viewMatches((view) => view.participants.some((p) => !p.online)),
    );

    const again = anaDevice.participant(roomId);
    await until(again, connected);

    expect(viewOf(again).me).toBe(viewOf(ana).me);
    await until(
      host,
      viewMatches((view) => view.participants.every((p) => p.online)),
    );
    expect(viewOf(host).participants).toHaveLength(2);
  });

  it("keeps History readable while the host is away, and resumes with sealed votes intact (FR-047)", async () => {
    const network = createInMemoryNetwork();
    const { roomId, host, hostDevice } = await hostedRoom(network);
    const { ana } = await joinAsAna(network, roomId);

    host.startRound();
    await until(
      ana,
      viewMatches((view) => view.round?.status === "voting"),
    );
    ana.castVote("5");
    const anaId = viewOf(ana).me;
    await until(
      host,
      viewMatches((view) => view.round?.votedIds.includes(anaId) ?? false),
    );

    host.close();
    await until(ana, (state) => state.status === "joined" && state.connection === "host-away");
    expect(viewOf(ana).stories.map((story) => story.title)).toEqual(["Saved cards"]);

    // The host comes back in the same browser: the room reloads from its record.
    const back = hostDevice.host(roomId);
    await until(back, joined);
    await until(ana, connected);
    back.reveal();
    await until(
      ana,
      viewMatches((view) => view.round?.status === "revealed"),
    );
    expect(viewOf(ana).round?.outcome?.votes.map((vote) => vote.card)).toEqual(["5"]);
  });

  it("restores the room on a new device from a participant's signed copy (SDD 11.6)", async () => {
    const network = createInMemoryNetwork();
    const { roomId, hostKey, host } = await hostedRoom(network);
    const { ana } = await joinAsAna(network, roomId);
    host.close();
    await until(ana, (state) => state.status === "joined" && state.connection !== "connected");

    // The new device has only what the host link gave it: the key.
    const laptop = device(network);
    await laptop.store.saveHostKey(roomId, hostKey, Date.now() + 60_000);
    const restored = laptop.host(roomId);

    await until(restored, joined);
    expect(viewOf(restored).stories.map((story) => story.title)).toEqual(["Saved cards"]);
    expect(viewOf(restored).participants.find((p) => p.id === viewOf(restored).me)).toMatchObject(
      PRIYA,
    );
    await until(ana, connected);
    expect(laptop.myRooms.list(Date.now())).toMatchObject([{ roomId, role: "host" }]);
  });

  it("shows a second tab or device that the room is open elsewhere (FR-046)", async () => {
    const network = createInMemoryNetwork();
    const { roomId, hostKey, host } = await hostedRoom(network);

    const other = device(network);
    await other.store.saveHostKey(roomId, hostKey, Date.now() + 60_000);
    const second = other.host(roomId);

    await until(second, (state) => state.status === "failed" && state.problem === "open-elsewhere");
    host.addStory("Guest checkout");
    await until(
      host,
      viewMatches((view) => view.stories.length === 2),
    );
  });

  it("won't join a room whose host can't prove it holds the room key (SDD 13.3, T-02)", async () => {
    const network = createInMemoryNetwork();
    const { roomId } = await webCryptoRoomKeys.createIdentity();
    const impostor = await webCryptoRoomCrypto.loadHostKeys(
      (await webCryptoRoomKeys.createIdentity()).hostKey,
    );
    network.transport().openHub(roomId, {
      onReady: () => undefined,
      onFailure: () => undefined,
      onOffline: () => undefined,
      onLink: (link: PeerLink) =>
        link.onMessage(async (text) => {
          const hello = JSON.parse(text) as { nonce: string };
          const welcome: HostMessage = {
            type: "welcome",
            protocol: PROTOCOL_VERSION,
            publicKey: impostor.publicKey,
            proof: await impostor.sign(challengePayload(roomId, hello.nonce)),
            snapshot: null,
            now: Date.now(),
          };
          link.send(encodeMessage(welcome));
        }),
    });

    const ana = device(network).participant(roomId);
    await until(ana, (state) => state.status === "failed" && state.problem === "host-unverified");
  });

  it("refuses anyone posing as the host and drops messages participants may not send (SDD 13.1)", async () => {
    const network = createInMemoryNetwork();
    const { roomId, host } = await hostedRoom(network);
    const hostId = viewOf(host).me;
    const replies: HostMessage[] = [];

    network.transport().connect(roomId, {
      onFailure: () => undefined,
      onOpen: (link) => {
        link.onMessage((text) => {
          const message = JSON.parse(text) as HostMessage;
          replies.push(message);
          if (message.type !== "welcome") return;
          link.send(JSON.stringify({ type: "reveal" }));
          link.send(JSON.stringify({ type: "add-story", title: "Injected" }));
          link.send(
            encodeMessage({
              type: "join",
              id: "x.1",
              participantId: hostId,
              token: "A".repeat(43),
              profile: { displayName: "Mallory", avatarId: null },
            }),
          );
        });
        link.send(
          encodeMessage({ type: "hello", protocol: PROTOCOL_VERSION, nonce: "n".repeat(22) }),
        );
      },
    });

    await vi.waitFor(() =>
      expect(replies).toContainEqual({ type: "reject", id: "x.1", refusal: "not-host" }),
    );
    expect(viewOf(host).stories.map((story) => story.title)).toEqual(["Saved cards"]);
    expect(viewOf(host).participants.map((p) => p.displayName)).toEqual(["Priya"]);
  });

  it("deletes an expired room from the device instead of opening it (FR-023)", async () => {
    const network = createInMemoryNetwork();
    const hostDevice = device(network);
    const createdAt = Date.now() - 25 * 60 * 60 * 1000;
    const createRoom = makeCreateRoom({
      roomKeys: webCryptoRoomKeys,
      store: hostDevice.store,
      myRooms: hostDevice.myRooms,
      now: () => createdAt,
    });
    const { roomId } = await createRoom("Checkout revamp");

    const host = hostDevice.host(roomId);
    await until(host, (state) => state.status === "unavailable");
    await vi.waitFor(async () => expect(await hostDevice.store.getRoom(roomId)).toBeNull());
    expect(network.hasHub(roomId)).toBe(false);
  });
});
