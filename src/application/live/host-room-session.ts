import { PROTOCOL_VERSION } from "@/domain/protocol/version";
import type { ParticipantId, Round } from "@/domain/room/room";
import type { EncodedHostKey } from "@/domain/room/room-identity";
import { type CardId, isCardId } from "@/domain/rules/deck";

import type { LiveSessionDependencies } from "./live-session-dependencies";
import { LIVE_TIMING } from "./live-timing";
import { createRateLimiter, type RateLimiter } from "./rate-limiter";
import { createListeners, createTimers, MAX_TIMER_DELAY_MS } from "./session-support";
import { SALT_BYTES, sealVote } from "./vote-seal";
import type { Hub, PeerLink } from "../ports/peer-transport";
import type { HostKeys } from "../ports/room-crypto";
import type { ConnectionDiagnostics, RoomSession } from "../ports/room-session";
import type { HostRoomRecord, KeptVote } from "../ports/room-store";
import {
  type ClientMessage,
  encodeMessage,
  type HostMessage,
  MESSAGE_LIMITS,
} from "../protocol/messages";
import { parseClientMessage } from "../protocol/parse-messages";
import { applyCommand, isRevealComplete } from "../referee/referee";
import type { Refusal, RoomCommand } from "../referee/room-command";
import { getCurrentRound, getHost, type RoomState, toSharedState } from "../referee/room-state";
import { listRoom } from "../room/list-room";
import type { RoomNotice, RoomSessionState, SessionProblem } from "../room/room-session-state";
import { toRoomLobby, toRoomView } from "../room/room-view";
import { challengePayload, type SignedState, statePayload } from "../sync/signed-state";
import { diffSharedState, isEmptyPatch } from "../sync/state-patch";

/** Each participant may send 10 messages a second, in bursts of up to 20 (SDD 12, rule 7). */
const RATE_LIMIT = { ratePerSecond: 10, burst: 20 } as const;
/** A link that keeps sending refused or malformed messages is closed (SDD 13.3, T-08). */
const MAX_STRIKES = 50;
/** Answers remembered per participant, so a repeated request gets the same answer. */
const REQUEST_LOG_SIZE = 200;
/** Random bytes in story, round and participant IDs. */
const ID_BYTES = 9;

/** A participant's browser connected to this one. */
interface Guest {
  link: PeerLink;
  /** It has had the welcome, so it may offer a copy or ask for the state. */
  greeted: boolean;
  /** It holds the current state, so it gets every change. */
  synced: boolean;
  /** Who joined over this link, once they have. */
  participantId: ParticipantId | null;
  lastHeardAt: number;
  limiter: RateLimiter;
  strikes: number;
  /** Its messages are handled one at a time, in the order they arrived. */
  queue: Promise<void>;
}

type Phase = "loading" | "opening" | "restoring" | "lobby" | "joined" | "failed" | "unavailable";

/**
 * The host's side of a live room (SDD 8, ADR-02). This browser runs the referee and keeps the
 * authoritative record: each change is signed, saved and only then acknowledged and sent to
 * everyone (SDD 10, consistency rules). Participants reach it through the transport's hub.
 */
export function createHostRoomSession({
  roomId,
  store,
  crypto,
  transport,
  myRooms,
  now,
  timing = LIVE_TIMING,
}: LiveSessionDependencies): RoomSession {
  const listeners = createListeners();
  const timers = createTimers();
  const guests = new Set<Guest>();
  const requestLogs = new Map<ParticipantId, Map<string, HostMessage | null>>();

  let phase: Phase = "loading";
  let problem: SessionProblem | null = null;
  let closed = false;
  let hostKey: EncodedHostKey | null = null;
  let keys: HostKeys | null = null;
  /** The referee's state. Null while restoring a room this device doesn't have yet. */
  let room: RoomState | null = null;
  /** The latest signed version of the shared state, as participants hold it. */
  let published: SignedState | null = null;
  let savedRoom: RoomState | null = null;
  let tokenHashes: Record<ParticipantId, string> = {};
  let tokensChanged = false;
  let me: ParticipantId | null = null;
  /** The host's latest card in the open round, shown at once while it is sealed. */
  let pick: { roundId: Round["id"]; card: CardId } | null = null;
  /** The card and salt behind the host's own seal, kept until reveal. */
  let myVote: KeptVote | null = null;
  let notice: RoomNotice | null = null;
  let hub: Hub | null = null;
  /** This device has taken charge of the room: it holds the address and the record. */
  let inCharge = false;
  let serviceReachable: boolean | null = null;
  let lastError: string | null = null;
  let hubAttempts = 0;
  let takenRetries = 0;
  let pendingAcks: { guest: Guest; participantId: ParticipantId; id: string }[] = [];
  let saving: Promise<void> = Promise.resolve();
  /**
   * This device's own actions run one at a time, in the order given: sealing a vote takes a
   * moment, and a reveal clicked straight after must not overtake it.
   */
  let localActions: Promise<void> = Promise.resolve();
  let cancelExpiry: (() => void) | null = null;
  let cancelRevealDeadline: (() => void) | null = null;

  let state: RoomSessionState = { status: "connecting" };
  let diagnostics = describeDiagnostics();

  // --- State and change notification --------------------------------------------------------

  function emit(): void {
    if (closed) return;
    state = describeState();
    diagnostics = describeDiagnostics();
    listeners.notify();
  }

  function describeState(): RoomSessionState {
    switch (phase) {
      case "loading":
      case "opening":
        return { status: "connecting" };
      case "restoring":
        return { status: "restoring" };
      case "failed":
        return { status: "failed", problem: problem ?? "service-unreachable" };
      case "unavailable":
        return { status: "unavailable" };
      case "lobby":
        return room
          ? { status: "lobby", lobby: toRoomLobby(room, "host") }
          : { status: "connecting" };
      case "joined": {
        if (!room || !me) return { status: "connecting" };
        const round = getCurrentRound(room);
        const card = pick && round?.id === pick.roundId ? pick.card : null;
        // Votes reach this device's own referee directly, so the host is always connected.
        return {
          status: "joined",
          view: toRoomView(room, me, card),
          connection: "connected",
          notice,
        };
      }
    }
  }

  function describeDiagnostics(): ConnectionDiagnostics {
    return {
      state:
        phase === "lobby" || phase === "joined"
          ? "connected"
          : phase === "restoring"
            ? "restoring"
            : phase === "failed" || phase === "unavailable"
              ? "failed"
              : "connecting",
      path: inCharge ? "host" : null,
      serviceReachable,
      lastError,
    };
  }

  function fail(next: SessionProblem, { stop }: { stop: boolean }): void {
    phase = "failed";
    problem = next;
    lastError = next;
    if (stop) stopNetworking();
    emit();
  }

  function becomeUnavailable(): void {
    stopNetworking();
    phase = "unavailable";
    emit();
  }

  function refuse(refusal: Refusal): void {
    notice = { id: (notice?.id ?? 0) + 1, refusal };
    emit();
  }

  // --- Loading and taking charge ------------------------------------------------------------

  async function start(): Promise<void> {
    try {
      hostKey = await store.getHostKey(roomId);
      if (!hostKey) return becomeUnavailable();
      const loaded = await crypto.loadHostKeys(hostKey);
      if (!(await crypto.isRoomKey(roomId, loaded.publicKey))) return becomeUnavailable();
      keys = loaded;

      const [record, vote] = await Promise.all([store.getRoom(roomId), store.getVote(roomId)]);
      if (record?.kind === "host") {
        room = record.state;
        savedRoom = record.state;
        tokenHashes = { ...record.tokenHashes };
        published = await signState(record.version, record.state);
      } else if (record?.kind === "participant" && (await isValidSnapshot(record.snapshot))) {
        // This device was in the room as a participant; its copy restores the room (SDD 11.6).
        room = { ...record.snapshot.state, seals: [], openings: [] };
        published = record.snapshot;
      }
      myVote = vote;
      if (closed) return;
      if (room && room.expiresAt <= now()) return expire();

      phase = "opening";
      emit();
      timers.every(timing.heartbeatMs, heartbeat);
      hub = transport.openHub(roomId, {
        onReady: onHubReady,
        onLink: welcomeLink,
        onFailure: onHubFailure,
        onOffline: onHubOffline,
      });
    } catch {
      lastError = "load-failed";
      becomeUnavailable();
    }
  }

  async function signState(version: number, current: RoomState): Promise<SignedState> {
    const shared = toSharedState(current);
    return { version, state: shared, signature: await keys!.sign(statePayload(version, shared)) };
  }

  async function isValidSnapshot(snapshot: SignedState): Promise<boolean> {
    return (
      keys !== null &&
      snapshot.state.roomId === roomId &&
      crypto.verify(
        keys.publicKey,
        statePayload(snapshot.version, snapshot.state),
        snapshot.signature,
      )
    );
  }

  function onHubReady(): void {
    serviceReachable = true;
    hubAttempts = 0;
    takenRetries = 0;
    if (lastError === "service-lost" || lastError === "service-unreachable") lastError = null;
    if (!room) {
      phase = "restoring";
      emit();
    } else if (!inCharge) {
      takeCharge();
    } else {
      emit();
    }
  }

  function onHubFailure(failure: "service-unreachable" | "hub-taken" | "unsupported"): void {
    switch (failure) {
      case "unsupported":
        return fail("unsupported-browser", { stop: true });
      case "hub-taken":
        serviceReachable = true;
        // A refresh can leave the old page's address registered for a moment.
        if (takenRetries < timing.hubRetries) {
          takenRetries += 1;
          timers.after(timing.hubRetryDelayMs, () => hub?.reconnect());
          return;
        }
        // Someone else hosts it now: only one device or tab may (FR-046).
        inCharge = false;
        return fail("open-elsewhere", { stop: true });
      case "service-unreachable":
        serviceReachable = false;
        lastError = "service-unreachable";
        timers.after(timing.reconnectDelayMs(hubAttempts++), () => hub?.reconnect());
        if (inCharge) emit();
        else fail("service-unreachable", { stop: false });
    }
  }

  /** Open links keep working while the connection service is away; new ones must wait. */
  function onHubOffline(): void {
    serviceReachable = false;
    lastError = "service-lost";
    timers.after(timing.reconnectDelayMs(hubAttempts++), () => hub?.reconnect());
    emit();
  }

  /** Runs the room from this device: everyone starts offline until their link returns. */
  function takeCharge(): void {
    if (!room) return;
    inCharge = true;
    problem = null;
    room = withPresence(room, onlineIds());
    const host = getHost(room);
    if (host) {
      // The host on this device, or the same host arriving from the host link (SDD 11.6).
      me = host.id;
      const profile = { displayName: host.displayName, avatarId: host.avatarId };
      dispatch(me, { type: "join", profile, asHost: true });
      phase = "joined";
      rememberRoom();
    } else {
      phase = "lobby";
    }
    const round = getCurrentRound(room);
    if (myVote && round?.id !== myVote.roundId) dropOwnVote();
    if (myVote) pick = { roundId: myVote.roundId, card: myVote.card };
    if (round?.status === "revealing") startReveal(round.id);
    scheduleExpiry();
    commit();
    emit();
  }

  function rememberRoom(): void {
    if (!room) return;
    listRoom(
      myRooms,
      {
        roomId,
        epicTitle: room.epicTitle,
        role: "host",
        createdAt: room.createdAt,
        expiresAt: room.expiresAt,
      },
      now(),
    );
  }

  function onlineIds(): Set<ParticipantId> {
    const ids = new Set<ParticipantId>();
    for (const guest of guests) if (guest.participantId) ids.add(guest.participantId);
    if (me && phase === "joined") ids.add(me);
    return ids;
  }

  // --- Changes: referee, then save, sign and send ------------------------------------------

  function dispatch(actor: ParticipantId, command: RoomCommand): Refusal | null {
    if (!room) return "not-in-room";
    const before = room;
    const result = applyCommand(room, actor, command, {
      now: now(),
      newId: () => crypto.randomToken(ID_BYTES),
    });
    if (!result.ok) return result.refusal;
    room = result.state;
    if (room !== before) afterChange(before);
    return null;
  }

  /** Moves the reveal along and keeps this device's own vote in step with the round. */
  function afterChange(before: RoomState): void {
    if (!room) return;
    const was = getCurrentRound(before);
    const round = getCurrentRound(room);
    if (round?.status === "revealing" && (was?.id !== round.id || was.status !== "revealing")) {
      startReveal(round.id);
    }
    const isOver = (roundId: Round["id"]) =>
      round?.id !== roundId || round.status === "revealed" || round.status === "cancelled";
    if (pick && isOver(pick.roundId)) pick = null;
    if (myVote && isOver(myVote.roundId)) dropOwnVote();
    if (isRevealComplete(room)) finishReveal();
    commit();
    emit();
  }

  /** Publishes changes one batch at a time, in order. */
  function commit(): void {
    saving = saving.then(publish);
  }

  /**
   * Signs the new version and saves it before anyone hears of it, so an acknowledged change
   * survives a refresh (SDD 10: saved before acknowledged). Changes made meanwhile wait for
   * the next batch.
   */
  async function publish(): Promise<void> {
    if (!room || !keys || !published || closed) return;
    const current = room;
    const acks = pendingAcks;
    pendingAcks = [];

    const shared = toSharedState(current);
    const patch = diffSharedState(published.state, shared);
    let message: HostMessage | null = null;
    if (!isEmptyPatch(patch)) {
      const version = published.version + 1;
      const signature = await keys.sign(statePayload(version, shared));
      published = { version, state: shared, signature };
      message = { type: "patch", version, patch, signature };
    }
    if (current !== savedRoom || tokensChanged) {
      tokensChanged = false;
      try {
        await store.saveRoom(hostRecord(current, published.version));
        savedRoom = current;
      } catch {
        // The room carries on in memory; a refresh would lose the latest changes.
        lastError = "storage-failed";
      }
    }
    if (closed) return;
    if (message) broadcast(message);
    for (const ack of acks)
      answer(ack.guest, ack.participantId, ack.id, { type: "ack", id: ack.id });
  }

  function hostRecord(current: RoomState, version: number): HostRoomRecord {
    return {
      kind: "host",
      roomId,
      version,
      state: current,
      tokenHashes,
      expiresAt: current.expiresAt,
    };
  }

  // --- Reveal and this device's own vote ----------------------------------------------------

  /** Voters open their votes; whatever hasn't arrived by the deadline isn't revealed (FR-043). */
  function startReveal(roundId: Round["id"]): void {
    cancelRevealDeadline?.();
    cancelRevealDeadline = timers.after(timing.revealDeadlineMs, () => {
      const round = room && getCurrentRound(room);
      if (round?.id === roundId && round.status === "revealing") finishReveal();
    });
    openOwnVote(roundId);
  }

  function finishReveal(): void {
    const host = room && getHost(room);
    if (host) dispatch(host.id, { type: "finish-reveal" });
  }

  /** The host votes through the same sealed path as everyone else (SDD 13.2). */
  async function castOwnVote(card: CardId): Promise<void> {
    const round = room && getCurrentRound(room);
    if (!room || !me || round?.status !== "voting") return ownVoteRefused("round-closed");
    const vote: KeptVote = {
      roundId: round.id,
      card,
      salt: crypto.randomToken(SALT_BYTES),
      replaced: null,
    };
    const seal = await sealVote(crypto, {
      roomId,
      roundId: round.id,
      participantId: me,
      card,
      salt: vote.salt,
    });
    // Kept before it counts, so a crash can't leave a seal nobody can open.
    await store.saveVote(roomId, vote, room.expiresAt).catch(() => undefined);
    if (closed || !room) return;
    if (getCurrentRound(room)?.id !== round.id) return ownVoteRefused("round-closed");
    const refusal = dispatch(me, { type: "cast-vote", seal });
    if (refusal) return ownVoteRefused(refusal);
    myVote = vote;
    emit();
  }

  /** The deck goes back to the card the referee holds, if any. */
  function ownVoteRefused(refusal: Refusal): void {
    pick = myVote ? { roundId: myVote.roundId, card: myVote.card } : null;
    refuse(refusal);
  }

  function openOwnVote(roundId: Round["id"]): void {
    localActions = localActions.then(async () => {
      const vote = myVote;
      if (!room || !me || vote?.roundId !== roundId) return;
      if (!getCurrentRound(room)?.votedIds.includes(me)) return;
      const fingerprint = await sealVote(crypto, {
        roomId,
        roundId,
        participantId: me,
        card: vote.card,
        salt: vote.salt,
      });
      if (!closed) dispatch(me, { type: "open-vote", card: vote.card, fingerprint });
    });
  }

  function dropOwnVote(): void {
    myVote = null;
    void store.deleteVote(roomId).catch(() => undefined);
  }

  // --- Participants' links -------------------------------------------------------------------

  function welcomeLink(link: PeerLink): void {
    const guest: Guest = {
      link,
      greeted: false,
      synced: false,
      participantId: null,
      lastHeardAt: now(),
      limiter: createRateLimiter({ ...RATE_LIMIT, now }),
      strikes: 0,
      queue: Promise.resolve(),
    };
    guests.add(guest);
    link.onMessage((text) => receive(guest, text));
    link.onClose(() => leave(guest));
  }

  function receive(guest: Guest, text: string): void {
    if (!guests.has(guest)) return;
    guest.lastHeardAt = now();
    if (!guest.limiter.take()) {
      strike(guest);
      const message = text.length <= MESSAGE_LIMITS.maxLength ? parseClientMessage(text) : null;
      if (message && "id" in message) {
        send(guest, { type: "reject", id: message.id, refusal: "rate-limited" });
      }
      return;
    }
    const message = parseClientMessage(text);
    if (!message) return strike(guest);
    guest.queue = guest.queue.then(() => handle(guest, message)).catch(() => undefined);
  }

  function strike(guest: Guest): void {
    guest.strikes += 1;
    if (guest.strikes > MAX_STRIKES) {
      guest.link.close();
      leave(guest);
    }
  }

  async function handle(guest: Guest, message: ClientMessage): Promise<void> {
    if (closed || !guests.has(guest)) return;
    switch (message.type) {
      case "ping":
        return;
      case "hello":
        return greet(guest, message.protocol, message.nonce);
      case "offer":
        if (guest.greeted) await receiveOffer(message.snapshot);
        return;
      case "resync":
        if (guest.greeted && published && room) {
          send(guest, { type: "snapshot", snapshot: published });
          guest.synced = true;
        }
        return;
      default:
        return handleRequest(guest, message);
    }
  }

  /** Proves this device holds the room key, then sends the room (SDD 11.3). */
  async function greet(guest: Guest, protocol: number, nonce: string): Promise<void> {
    if (protocol !== PROTOCOL_VERSION) {
      send(guest, { type: "incompatible", protocol: PROTOCOL_VERSION });
      return;
    }
    if (!keys) return;
    const proof = await keys.sign(challengePayload(roomId, nonce));
    if (closed || !guests.has(guest)) return;
    send(guest, {
      type: "welcome",
      protocol: PROTOCOL_VERSION,
      publicKey: keys.publicKey,
      proof,
      snapshot: room ? published : null,
      now: now(),
    });
    guest.greeted = true;
    guest.synced = room !== null;
  }

  /**
   * A participant's signed copy. A restoring host adopts it, and so does a host whose own
   * record is older, for example on a device it used earlier (SDD 11.6).
   */
  async function receiveOffer(snapshot: SignedState): Promise<void> {
    const isNewer = () => !published || snapshot.version > published.version;
    if (!isNewer() || !(await isValidSnapshot(snapshot)) || closed || !isNewer()) return;

    const restoring = room === null;
    room = { ...snapshot.state, seals: [], openings: [] };
    published = snapshot;
    savedRoom = null;
    if (hostKey) void store.saveHostKey(roomId, hostKey, room.expiresAt).catch(() => undefined);
    for (const guest of guests) {
      if (!guest.greeted) continue;
      send(guest, { type: "snapshot", snapshot });
      guest.synced = true;
    }
    if (restoring || !inCharge) return takeCharge();

    me = getHost(room)?.id ?? null;
    if (!me) phase = "lobby";
    room = withPresence(room, onlineIds());
    commit();
    emit();
  }

  async function handleRequest(
    guest: Guest,
    request: Extract<ClientMessage, { id: string }>,
  ): Promise<void> {
    if (!room || !guest.synced) {
      send(guest, { type: "reject", id: request.id, refusal: "not-in-room" });
      return;
    }
    if (request.type === "join") return join(guest, request);

    const participantId = guest.participantId;
    if (!participantId) {
      send(guest, { type: "reject", id: request.id, refusal: "not-in-room" });
      return;
    }
    // A repeated request gets the answer the first one got (SDD 12, rule 4).
    const log = logOf(participantId);
    if (log.has(request.id)) {
      const answered = log.get(request.id);
      if (answered) send(guest, answered);
      return;
    }
    log.set(request.id, null);
    if (log.size > REQUEST_LOG_SIZE) log.delete(log.keys().next().value!);

    switch (request.type) {
      case "profile":
        return settle(
          guest,
          participantId,
          request.id,
          dispatch(participantId, { type: "update-profile", profile: request.profile }),
        );
      case "vote":
        return settle(
          guest,
          participantId,
          request.id,
          getCurrentRound(room)?.id === request.roundId
            ? dispatch(participantId, { type: "cast-vote", seal: request.seal })
            : "round-closed",
        );
      case "open": {
        const fingerprint = await sealVote(crypto, {
          roomId,
          roundId: request.roundId,
          participantId,
          card: request.card,
          salt: request.salt,
        });
        return settle(
          guest,
          participantId,
          request.id,
          room && getCurrentRound(room)?.id === request.roundId
            ? dispatch(participantId, { type: "open-vote", card: request.card, fingerprint })
            : "round-closed",
        );
      }
    }
  }

  /**
   * Admits a participant, or recognises a returning one by their token (FR-006). The host
   * keeps only each token's fingerprint. A room restored from a copy has no fingerprints yet,
   * so it accepts the first token each person presents.
   */
  async function join(
    guest: Guest,
    request: Extract<ClientMessage, { type: "join" }>,
  ): Promise<void> {
    const { participantId } = request;
    const reject = (refusal: Refusal) => send(guest, { type: "reject", id: request.id, refusal });
    if (room && getHost(room)?.id === participantId) return reject("not-host");
    if (guest.participantId && guest.participantId !== participantId) return reject("not-in-room");

    const tokenHash = await crypto.digest(request.token);
    if (!room || closed) return;
    const known = tokenHashes[participantId];
    if (known !== undefined && known !== tokenHash) return reject("not-in-room");

    // A refresh or a second tab replaces the participant's older link.
    for (const other of guests) {
      if (other !== guest && other.participantId === participantId) {
        other.participantId = null;
        other.link.close();
      }
    }
    guest.participantId = participantId;
    const refusal = dispatch(participantId, {
      type: "join",
      profile: request.profile,
      asHost: false,
    });
    if (refusal) {
      guest.participantId = null;
      return reject(refusal);
    }
    if (known === undefined) {
      tokenHashes = { ...tokenHashes, [participantId]: tokenHash };
      tokensChanged = true;
    }
    settle(guest, participantId, request.id, null);
  }

  /** Refusals go back at once; acceptances once the change is saved. */
  function settle(
    guest: Guest,
    participantId: ParticipantId,
    id: string,
    refusal: Refusal | null,
  ): void {
    if (refusal) {
      answer(guest, participantId, id, { type: "reject", id, refusal });
      return;
    }
    pendingAcks.push({ guest, participantId, id });
    commit();
  }

  function answer(
    guest: Guest,
    participantId: ParticipantId,
    id: string,
    message: HostMessage,
  ): void {
    const log = requestLogs.get(participantId);
    if (log?.has(id)) log.set(id, message);
    send(guest, message);
  }

  function logOf(participantId: ParticipantId): Map<string, HostMessage | null> {
    let log = requestLogs.get(participantId);
    if (!log) {
      log = new Map();
      requestLogs.set(participantId, log);
    }
    return log;
  }

  /** Someone whose last link closed shows as offline; their sealed vote stays (SDD 15). */
  function leave(guest: Guest): void {
    if (!guests.delete(guest)) return;
    const { participantId } = guest;
    if (!participantId || !room) return;
    if ([...guests].some((other) => other.participantId === participantId)) return;
    dispatch(participantId, { type: "set-online", online: false });
  }

  function send(guest: Guest, message: HostMessage): void {
    try {
      guest.link.send(encodeMessage(message));
    } catch {
      // A closing link; its close handler tidies up.
    }
  }

  function broadcast(message: HostMessage): void {
    const text = encodeMessage(message);
    for (const guest of guests) {
      if (!guest.synced) continue;
      try {
        guest.link.send(text);
      } catch {
        // As in `send`.
      }
    }
  }

  /** Presence only: closes links that have gone quiet (SDD 12, `ping`). */
  function heartbeat(): void {
    const at = now();
    for (const guest of [...guests]) {
      if (at - guest.lastHeardAt > timing.silenceLimitMs) {
        guest.link.close();
        leave(guest);
      } else if (guest.greeted) {
        send(guest, { type: "ping", now: at });
      }
    }
  }

  // --- Expiry and shutdown --------------------------------------------------------------------

  function scheduleExpiry(): void {
    cancelExpiry?.();
    if (!room) return;
    const remaining = room.expiresAt - now();
    if (remaining <= 0) return expire();
    cancelExpiry = timers.after(Math.min(remaining, MAX_TIMER_DELAY_MS), scheduleExpiry);
  }

  /** At its deadline the room closes and leaves this device (PRD FR-023, SDD 11.5). */
  function expire(): void {
    becomeUnavailable();
    void store.deleteRoom(roomId).catch(() => undefined);
  }

  function stopNetworking(): void {
    timers.clear();
    cancelExpiry = null;
    cancelRevealDeadline = null;
    hub?.close();
    hub = null;
    for (const guest of guests) guest.link.close();
    guests.clear();
    inCharge = false;
  }

  /** Commands from this device's own screen. */
  function command(next: RoomCommand): void {
    localActions = localActions.then(() => {
      if (phase !== "joined" || !me || closed) return;
      const refusal = dispatch(me, next);
      if (refusal) refuse(refusal);
    });
  }

  void start();

  return {
    getState: () => state,
    getDiagnostics: () => diagnostics,
    subscribe: listeners.subscribe,

    retry() {
      if (phase !== "failed" || closed) return;
      stopNetworking();
      room = null;
      published = null;
      savedRoom = null;
      me = null;
      problem = null;
      hubAttempts = 0;
      takenRetries = 0;
      phase = "loading";
      emit();
      void start();
    },

    async join(profile) {
      if (phase !== "lobby" || !room) return;
      const id = crypto.randomToken(ID_BYTES) as ParticipantId;
      const refusal = dispatch(id, { type: "join", profile, asHost: true });
      if (refusal) throw new Error(`Join refused: ${refusal}`);
      me = id;
      phase = "joined";
      rememberRoom();
      emit();
      await saving;
    },

    updateProfile: (profile) => command({ type: "update-profile", profile }),
    addStory: (title) => command({ type: "add-story", title }),
    renameStory: (storyId, title) => command({ type: "rename-story", storyId, title }),
    moveStory: (storyId, toIndex) => command({ type: "move-story", storyId, toIndex }),
    removeStory: (storyId) => command({ type: "remove-story", storyId }),
    restoreStory: (storyId) => command({ type: "restore-story", storyId }),
    deleteStory: (storyId) => command({ type: "delete-story", storyId }),
    activateStory: (storyId) => command({ type: "activate-story", storyId }),
    startRound: () => command({ type: "start-round" }),
    reveal: () => command({ type: "reveal" }),
    startTimer: (durationMs) => command({ type: "start-timer", durationMs }),
    stopTimer: () => command({ type: "stop-timer" }),
    endRoom: () => command({ type: "end-room" }),

    castVote(card) {
      if (phase !== "joined" || !me || !room) return;
      if (!isCardId(card)) return refuse("invalid-card");
      const round = getCurrentRound(room);
      if (round?.status !== "voting") return refuse("round-closed");
      pick = { roundId: round.id, card };
      emit();
      localActions = localActions.then(() => castOwnVote(card));
    },

    close() {
      closed = true;
      stopNetworking();
      listeners.clear();
    },

    async forget() {
      // Deleting an open room this device hosts ends it for everyone first (PRD 13).
      await localActions;
      if (room?.status === "active" && me && phase === "joined") dispatch(me, { type: "end-room" });
      await saving;
      closed = true;
      stopNetworking();
      listeners.clear();
      await store.deleteRoom(roomId);
    },
  };
}

/** Marks exactly the people in `online` as online, keeping the state unchanged otherwise. */
function withPresence(state: RoomState, online: ReadonlySet<ParticipantId>): RoomState {
  if (state.participants.every((person) => person.online === online.has(person.id))) return state;
  return {
    ...state,
    participants: state.participants.map((person) =>
      person.online === online.has(person.id)
        ? person
        : { ...person, online: online.has(person.id) },
    ),
  };
}
