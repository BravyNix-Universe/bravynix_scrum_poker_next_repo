import { PROTOCOL_VERSION } from "@/domain/protocol/version";
import type { Profile } from "@/domain/room/profile";
import type { ParticipantId, RoundId } from "@/domain/room/room";
import { type CardId, isCardId } from "@/domain/rules/deck";

import type { LiveSessionDependencies } from "./live-session-dependencies";
import { LIVE_TIMING } from "./live-timing";
import { createListeners, createTimers, MAX_TIMER_DELAY_MS } from "./session-support";
import { SALT_BYTES, sealVote } from "./vote-seal";
import type {
  LinkPath,
  PeerLink,
  PendingConnection,
  TransportFailure,
} from "../ports/peer-transport";
import type { ConnectionDiagnostics, RoomSession } from "../ports/room-session";
import type { KeptVote, Membership } from "../ports/room-store";
import {
  type ClientMessage,
  type ClientRequest,
  encodeMessage,
  type HostMessage,
} from "../protocol/messages";
import { parseHostMessage } from "../protocol/parse-messages";
import type { Refusal } from "../referee/room-command";
import { getCurrentRound, type SharedRoomState } from "../referee/room-state";
import { listRoom } from "../room/list-room";
import type {
  ConnectionStatus,
  RoomNotice,
  RoomSessionState,
  SessionProblem,
} from "../room/room-session-state";
import { type RoomView, toRoomLobby, toRoomView } from "../room/room-view";
import { challengePayload, type SignedState, statePayload } from "../sync/signed-state";
import { applyStatePatch } from "../sync/state-patch";

/** Random bytes in a participant ID, a token and a handshake nonce (SDD 13.1). */
const PARTICIPANT_ID_BYTES = 9;
const TOKEN_BYTES = 32;
const NONCE_BYTES = 16;
const TAG_BYTES = 6;

type WithoutId<T> = T extends unknown ? Omit<T, "id"> : never;

interface OutgoingRequest {
  message: ClientRequest;
  onAck?: () => void;
  onReject?: (refusal: Refusal) => void;
}

type Phase =
  "loading" | "connecting" | "waiting-for-host" | "lobby" | "joined" | "failed" | "unavailable";

/**
 * A participant's side of a live room (SDD 11.3 to 11.6). It checks that whoever answers holds
 * the room key, follows the host's signed changes in order, keeps its own signed copy, and
 * seals votes so nobody sees a card before reveal. While the host is away, this device's copy
 * keeps History readable (FR-047).
 */
export function createParticipantRoomSession({
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
  /** Makes message IDs unique across page loads (SDD 12, rule 4). */
  const tag = crypto.randomToken(TAG_BYTES);
  /** Requests not yet answered. They are sent again, with the same IDs, after a reconnect. */
  const outbox = new Map<string, OutgoingRequest>();
  const closedLinks = new WeakSet<PeerLink>();

  let phase: Phase = "loading";
  let problem: SessionProblem | null = null;
  let connection: ConnectionStatus = "reconnecting";
  let closed = false;
  /** A problem only "Try again" can clear: no automatic reconnects. */
  let stopped = false;

  /** The latest state the host signed. */
  let copy: SignedState | null = null;
  let hostPublicKey: string | null = null;
  let membership: Membership | null = null;
  let counter = 0;

  let link: PeerLink | null = null;
  let pendingConnection: PendingConnection | null = null;
  let attempts = 0;
  let nonce = "";
  /** The host proved it holds the room key on this link. */
  let greeted = false;
  /** This device holds the host's current state and follows its changes. */
  let synced = false;
  /** Joined over this link, so requests can flow. */
  let admitted = false;
  let joining: { id: string; resolve: () => void; reject: (error: Error) => void } | null = null;
  let inbox: Promise<void> = Promise.resolve();
  let lastHeardAt = 0;
  /** The host's clock minus this device's, so countdowns match the host's (SDD 15). */
  let clockOffset = 0;

  /** This person's latest card in the open round, shown on their deck. */
  let pick: { roundId: RoundId; card: CardId } | null = null;
  /** The card and salt behind this device's seal, kept until reveal (SDD 11.4). */
  let kept: KeptVote | null = null;
  /** The host has acknowledged the seal of `kept`. */
  let keptConfirmed = false;
  let voteInFlight = false;
  let openedRoundId: RoundId | null = null;

  let notice: RoomNotice | null = null;
  let serviceReachable: boolean | null = null;
  let path: LinkPath | null = null;
  let lastError: string | null = null;
  let cancelRetry: (() => void) | null = null;
  let cancelWelcome: (() => void) | null = null;
  let cancelExpiry: (() => void) | null = null;

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
      case "connecting":
        return { status: "connecting" };
      case "waiting-for-host":
        return { status: "waiting-for-host" };
      case "failed":
        return { status: "failed", problem: problem ?? "host-unreachable" };
      case "unavailable":
        return { status: "unavailable" };
      case "lobby":
        return copy
          ? { status: "lobby", lobby: toRoomLobby(copy.state, "participant") }
          : { status: "connecting" };
      case "joined":
        return copy && membership
          ? {
              status: "joined",
              view: onHostClock(
                toRoomView(copy.state, membership.participantId, pick?.card ?? null),
              ),
              connection,
              notice,
            }
          : { status: "connecting" };
    }
  }

  /** Timer deadlines are set by the host's clock; this device's may differ. */
  function onHostClock(view: RoomView): RoomView {
    return view.timer
      ? { ...view, timer: { ...view.timer, endsAt: view.timer.endsAt - clockOffset } }
      : view;
  }

  function describeDiagnostics(): ConnectionDiagnostics {
    return {
      state:
        phase === "joined"
          ? connection
          : phase === "lobby"
            ? "connected"
            : phase === "loading"
              ? "connecting"
              : phase === "unavailable"
                ? "failed"
                : phase,
      path: greeted ? path : null,
      serviceReachable,
      lastError,
    };
  }

  function refuse(refusal: Refusal): void {
    notice = { id: (notice?.id ?? 0) + 1, refusal };
    emit();
  }

  /** Stops on a problem reconnecting can't fix; "Try again" starts over. */
  function stop(next: SessionProblem): void {
    stopped = true;
    phase = "failed";
    problem = next;
    lastError = next;
    disconnect();
    emit();
  }

  function isMember(): boolean {
    const id = membership?.participantId;
    return !!id && !!copy?.state.participants.some((person) => person.id === id);
  }

  function profileIn(room: SharedRoomState | undefined): Profile | null {
    const person = room?.participants.find((p) => p.id === membership?.participantId);
    return person ? { displayName: person.displayName, avatarId: person.avatarId } : null;
  }

  // --- Loading and connecting ---------------------------------------------------------------

  async function start(): Promise<void> {
    try {
      const [record, member, vote] = await Promise.all([
        store.getRoom(roomId),
        store.getMembership(roomId),
        store.getVote(roomId),
      ]);
      if (closed) return;
      if (record?.kind === "participant") {
        if (record.expiresAt <= now()) return expire();
        copy = record.snapshot;
        hostPublicKey = record.hostPublicKey;
      }
      membership = member;
      kept = vote;
      const round = copy && getCurrentRound(copy.state);
      if (kept && round?.id === kept.roundId && round.status === "voting") {
        pick = { roundId: kept.roundId, card: kept.card };
      }
    } catch {
      lastError = "storage-failed";
    }
    phase = "connecting";
    emit();
    timers.every(timing.heartbeatMs, heartbeat);
    scheduleExpiry();
    connect();
  }

  function connect(): void {
    if (closed || stopped || link || pendingConnection) return;
    cancelRetry = null;
    pendingConnection = transport.connect(roomId, { onOpen, onFailure: onConnectFailure });
  }

  function retryLater(): void {
    cancelRetry?.();
    cancelRetry = timers.after(timing.reconnectDelayMs(attempts++), connect);
  }

  function onConnectFailure(failure: TransportFailure): void {
    pendingConnection = null;
    if (closed || stopped) return;
    lastError = failure;
    serviceReachable = failure !== "service-unreachable";
    if (failure === "unsupported") return stop("unsupported-browser");

    const status: ConnectionStatus = failure === "host-offline" ? "host-away" : "reconnecting";
    if (phase === "joined" || isMember()) {
      // History stays readable from this device's own copy (FR-047).
      phase = "joined";
      connection = status;
    } else if (failure === "host-offline") {
      phase = "waiting-for-host";
    } else {
      phase = "failed";
      problem = failure === "service-unreachable" ? "service-unreachable" : "host-unreachable";
    }
    emit();
    retryLater();
  }

  function onOpen(opened: PeerLink): void {
    pendingConnection = null;
    if (closed || stopped) return opened.close();
    link = opened;
    greeted = false;
    synced = false;
    admitted = false;
    serviceReachable = true;
    lastHeardAt = now();
    nonce = crypto.randomToken(NONCE_BYTES);
    opened.onMessage((text) => {
      if (link === opened) receive(text);
    });
    opened.onClose(() => onLinkClosed(opened));
    send({ type: "hello", protocol: PROTOCOL_VERSION, nonce });
    cancelWelcome = timers.after(timing.welcomeTimeoutMs, () => {
      if (link !== opened || greeted) return;
      lastError = "no-welcome";
      disconnect();
      onLinkClosed(opened);
    });
    void opened
      .getPath()
      .then((found) => {
        if (link !== opened) return;
        path = found;
        emit();
      })
      .catch(() => undefined);
  }

  function onLinkClosed(closedLink: PeerLink): void {
    // Both this session and the transport may report the same close.
    if (closedLinks.has(closedLink) || (link !== closedLink && link !== null)) return;
    closedLinks.add(closedLink);
    link = null;
    greeted = false;
    synced = false;
    admitted = false;
    path = null;
    cancelWelcome?.();
    joining?.reject(new Error("The connection to the host closed"));
    joining = null;
    if (closed || stopped) return;
    lastError ??= "connection-lost";
    if (phase === "joined") connection = "reconnecting";
    else if (phase === "lobby") phase = "connecting";
    emit();
    retryLater();
  }

  function disconnect(): void {
    pendingConnection?.cancel();
    pendingConnection = null;
    cancelRetry?.();
    const current = link;
    link = null;
    current?.close();
  }

  function send(message: ClientMessage): void {
    try {
      link?.send(encodeMessage(message));
    } catch {
      // The link is closing; its close handler reconnects.
    }
  }

  /** Presence only: a host that has gone quiet is treated as lost (SDD 12, `ping`). */
  function heartbeat(): void {
    const current = link;
    if (!current) return;
    if (now() - lastHeardAt > timing.silenceLimitMs) {
      lastError = "host-silent";
      disconnect();
      onLinkClosed(current);
    } else if (greeted) {
      send({ type: "ping" });
    }
  }

  // --- Messages from the host -----------------------------------------------------------------

  function receive(text: string): void {
    lastHeardAt = now();
    const message = parseHostMessage(text);
    if (!message) return;
    // One at a time: checking signatures is asynchronous, and changes must apply in order.
    inbox = inbox.then(() => handle(message)).catch(() => undefined);
  }

  async function handle(message: HostMessage): Promise<void> {
    if (closed || stopped || !link) return;
    switch (message.type) {
      case "ping":
        clockOffset = message.now - now();
        return;
      case "incompatible":
        return stop("outdated-app");
      case "welcome":
        return onWelcome(message);
      case "snapshot":
        if (greeted) await receiveSnapshot(message.snapshot);
        return;
      case "patch":
        if (synced) await receivePatch(message.version, message.patch, message.signature);
        return;
      case "ack":
        return settle(message.id, null);
      case "reject":
        return settle(message.id, message.refusal);
    }
  }

  /** The host must prove it holds the key the room ID was derived from (SDD 11.3). */
  async function onWelcome(welcome: Extract<HostMessage, { type: "welcome" }>): Promise<void> {
    if (greeted) return;
    if (welcome.protocol !== PROTOCOL_VERSION) return stop("outdated-app");
    const proven =
      (await crypto.isRoomKey(roomId, welcome.publicKey)) &&
      (await crypto.verify(welcome.publicKey, challengePayload(roomId, nonce), welcome.proof));
    if (!proven) return stop("host-unverified");

    cancelWelcome?.();
    greeted = true;
    hostPublicKey = welcome.publicKey;
    clockOffset = welcome.now - now();
    attempts = 0;
    lastError = null;
    if (welcome.snapshot) {
      await receiveSnapshot(welcome.snapshot);
    } else if (copy) {
      // The host is restoring the room on a new device, from copies like this one (SDD 11.6).
      send({ type: "offer", snapshot: copy });
    } else if (phase !== "joined") {
      phase = "waiting-for-host";
      emit();
    }
  }

  function isAuthentic(snapshot: SignedState): Promise<boolean> | boolean {
    return (
      hostPublicKey !== null &&
      snapshot.state.roomId === roomId &&
      crypto.verify(
        hostPublicKey,
        statePayload(snapshot.version, snapshot.state),
        snapshot.signature,
      )
    );
  }

  async function receiveSnapshot(snapshot: SignedState): Promise<void> {
    if (!(await isAuthentic(snapshot))) return stop("host-unverified");
    if (copy && snapshot.version < copy.version) {
      // The host's record is older than this copy, for example on a device it used earlier.
      send({ type: "offer", snapshot: copy });
      return;
    }
    adopt(snapshot);
  }

  /** Changes apply strictly in order; a gap or a bad signature asks for the full state. */
  async function receivePatch(
    version: number,
    patch: Extract<HostMessage, { type: "patch" }>["patch"],
    signature: string,
  ): Promise<void> {
    if (!copy || version <= copy.version) return;
    if (version === copy.version + 1) {
      const next = { version, state: applyStatePatch(copy.state, patch), signature };
      if (await isAuthentic(next)) return adopt(next);
    }
    synced = false;
    send({ type: "resync" });
  }

  function adopt(snapshot: SignedState): void {
    const before = copy?.state;
    copy = snapshot;
    synced = true;
    if (admitted) saveCopy();
    if (snapshot.state.expiresAt <= now()) return expire();
    scheduleExpiry();
    keepVoteInStep();

    if (admitted && !isMember()) {
      // The host restored an older state that doesn't include this person yet: join again.
      admitted = false;
      const profile = profileIn(before);
      if (profile) void rejoin(profile);
      else phase = "lobby";
    } else if (!admitted && !joining) {
      const profile = profileIn(snapshot.state);
      if (profile) void rejoin(profile);
      else if (phase !== "joined") phase = "lobby";
    }
    maybeOpenVote();
    emit();
  }

  function saveCopy(): void {
    if (!copy || !hostPublicKey) return;
    const record = {
      kind: "participant" as const,
      roomId,
      hostPublicKey,
      snapshot: copy,
      expiresAt: copy.state.expiresAt,
    };
    void store.saveRoom(record).catch(() => {
      lastError = "storage-failed";
    });
  }

  // --- Joining ----------------------------------------------------------------------------------

  /** A returning participant rejoins with the same identity, without the join screen (FR-006). */
  async function rejoin(profile: Profile): Promise<void> {
    try {
      await sendJoin(profile);
    } catch {
      // Refused or disconnected: the state already says what happens next.
    }
  }

  function sendJoin(profile: Profile): Promise<void> {
    const identity = membership;
    if (!identity || !link) return Promise.reject(new Error("Not connected to the host"));
    return new Promise((resolve, reject) => {
      const id = nextId();
      joining = { id, resolve, reject };
      send({ type: "join", id, ...identity, profile });
    });
  }

  function onJoinAnswer(
    refusal: Refusal | null,
    resolve: () => void,
    reject: (error: Error) => void,
  ): void {
    if (refusal) {
      if (refusal === "room-full") stop("room-full");
      else if (refusal === "not-in-room" && phase !== "lobby") {
        // This identity isn't recognised here: join as someone new, as after clearing storage.
        membership = null;
        phase = "lobby";
        emit();
      }
      reject(new Error(`Join refused: ${refusal}`));
      return;
    }
    admitted = true;
    phase = "joined";
    connection = "connected";
    lastError = null;
    saveCopy();
    rememberRoom();
    // Requests the host never answered go again, with the same IDs (SDD 12, rule 4).
    for (const { message } of outbox.values()) send(message);
    void pumpVote();
    maybeOpenVote();
    emit();
    resolve();
  }

  function rememberRoom(): void {
    if (!copy) return;
    const { epicTitle, createdAt, expiresAt } = copy.state;
    listRoom(myRooms, { roomId, epicTitle, role: "participant", createdAt, expiresAt }, now());
  }

  // --- Requests -------------------------------------------------------------------------------

  function nextId(): string {
    counter += 1;
    return `${tag}.${counter}`;
  }

  function request(
    message: WithoutId<ClientRequest>,
    handlers: Omit<OutgoingRequest, "message"> = {},
  ): void {
    const full = { ...message, id: nextId() } as ClientRequest;
    outbox.set(full.id, { message: full, ...handlers });
    if (admitted) send(full);
  }

  function settle(id: string, refusal: Refusal | null): void {
    if (joining?.id === id) {
      const { resolve, reject } = joining;
      joining = null;
      return onJoinAnswer(refusal, resolve, reject);
    }
    const pending = outbox.get(id);
    if (!pending) return;
    outbox.delete(id);
    if (!refusal) pending.onAck?.();
    else if (pending.onReject) pending.onReject(refusal);
    else refuse(refusal);
  }

  // --- Sealed votes -------------------------------------------------------------------------

  /** Drops picks and kept votes once their round is over; deletes the card at reveal. */
  function keepVoteInStep(): void {
    const round = copy && getCurrentRound(copy.state);
    const isOver = (roundId: RoundId) =>
      round?.id !== roundId || round.status === "revealed" || round.status === "cancelled";
    if (pick && isOver(pick.roundId)) pick = null;
    if (kept && isOver(kept.roundId)) {
      kept = null;
      keptConfirmed = false;
      void store.deleteVote(roomId).catch(() => undefined);
    }
  }

  /**
   * Sends the latest pick as a seal, one at a time: a change waits until the host has
   * answered the previous one, so this device always knows which seal the host may hold.
   */
  async function pumpVote(): Promise<void> {
    if (voteInFlight || !pick || !copy || !membership || !admitted) return;
    const round = getCurrentRound(copy.state);
    if (round?.id !== pick.roundId || round.status !== "voting") return;

    const sameRound = kept?.roundId === round.id;
    let vote: KeptVote;
    if (kept && sameRound && kept.card === pick.card) {
      if (keptConfirmed) return;
      // Not yet acknowledged, for example after a reload: send the same seal again.
      vote = kept;
    } else {
      vote = {
        roundId: round.id,
        card: pick.card,
        salt: crypto.randomToken(SALT_BYTES),
        replaced:
          kept && sameRound
            ? keptConfirmed
              ? { card: kept.card, salt: kept.salt }
              : kept.replaced
            : null,
      };
    }

    voteInFlight = true;
    const { participantId } = membership;
    try {
      kept = vote;
      keptConfirmed = false;
      // Kept before it is sent, so a crash can't leave a seal nobody can open.
      await store.saveVote(roomId, vote, copy.state.expiresAt);
      const seal = await sealVote(crypto, {
        roomId,
        roundId: vote.roundId,
        participantId,
        card: vote.card,
        salt: vote.salt,
      });
      request(
        { type: "vote", roundId: vote.roundId, seal },
        {
          onAck: () => voteAnswered(vote, null),
          onReject: (refusal) => voteAnswered(vote, refusal),
        },
      );
    } catch {
      voteInFlight = false;
      lastError = "storage-failed";
      emit();
    }
  }

  function voteAnswered(vote: KeptVote, refusal: Refusal | null): void {
    voteInFlight = false;
    if (kept === vote) {
      if (refusal) {
        // The host still holds the seal this one replaced, if any.
        kept = vote.replaced ? { ...vote, ...vote.replaced, replaced: null } : null;
        keptConfirmed = kept !== null;
        pick = kept ? { roundId: kept.roundId, card: kept.card } : null;
      } else {
        kept = { ...vote, replaced: null };
        keptConfirmed = true;
      }
      const expiresAt = copy?.state.expiresAt ?? now();
      const saved = kept ? store.saveVote(roomId, kept, expiresAt) : store.deleteVote(roomId);
      void saved.catch(() => undefined);
    }
    if (refusal) refuse(refusal);
    else void pumpVote();
    emit();
  }

  /** At reveal, sends the card and salt behind this device's seal (SDD 11.4). */
  function maybeOpenVote(): void {
    if (!admitted || !copy || !membership || !kept) return;
    const round = getCurrentRound(copy.state);
    if (round?.status !== "revealing" || round.id !== kept.roundId || openedRoundId === round.id) {
      return;
    }
    if (!round.votedIds.includes(membership.participantId)) return;
    openedRoundId = round.id;

    const open = (opening: { card: CardId; salt: string }, fallback: KeptVote["replaced"]) =>
      request(
        { type: "open", roundId: round.id, card: opening.card, salt: opening.salt },
        {
          onReject: (refusal) => {
            // A change that arrived after voting closed: the host holds the earlier seal.
            if (refusal === "seal-mismatch" && fallback) open(fallback, null);
            else if (refusal === "seal-mismatch") refuse(refusal);
          },
        },
      );
    open(kept, kept.replaced);
  }

  // --- Expiry and shutdown --------------------------------------------------------------------

  function scheduleExpiry(): void {
    cancelExpiry?.();
    if (!copy) return;
    const remaining = copy.state.expiresAt - now();
    if (remaining <= 0) return expire();
    cancelExpiry = timers.after(Math.min(remaining, MAX_TIMER_DELAY_MS), scheduleExpiry);
  }

  /** At its deadline the room leaves this device, with its token and vote (SDD 11.5). */
  function expire(): void {
    stopped = true;
    disconnect();
    timers.clear();
    phase = "unavailable";
    emit();
    void store.deleteRoom(roomId).catch(() => undefined);
  }

  function shutdown(): void {
    closed = true;
    disconnect();
    timers.clear();
    listeners.clear();
  }

  /** Host actions start only in the host's browser (SDD 13.1); the UI never offers them here. */
  const hostOnly = () => refuse("not-host");

  void start();

  return {
    getState: () => state,
    getDiagnostics: () => diagnostics,
    subscribe: listeners.subscribe,

    retry() {
      if (phase !== "failed" || closed) return;
      stopped = false;
      problem = null;
      attempts = 0;
      phase = isMember() ? "joined" : "connecting";
      connection = "reconnecting";
      emit();
      cancelRetry?.();
      connect();
    },

    async join(profile) {
      if (phase !== "lobby" || !copy) throw new Error("The room isn't ready to join");
      membership ??= {
        participantId: crypto.randomToken(PARTICIPANT_ID_BYTES) as ParticipantId,
        token: crypto.randomToken(TOKEN_BYTES),
      };
      await store.saveMembership(roomId, membership, copy.state.expiresAt).catch(() => undefined);
      await sendJoin(profile);
    },

    updateProfile(profile) {
      if (phase === "joined") request({ type: "profile", profile });
    },

    castVote(card) {
      if (phase !== "joined" || connection !== "connected" || !admitted || !copy) return;
      if (!isCardId(card)) return refuse("invalid-card");
      const round = getCurrentRound(copy.state);
      if (round?.status !== "voting") return refuse("round-closed");
      pick = { roundId: round.id, card };
      emit();
      void pumpVote();
    },

    addStory: hostOnly,
    renameStory: hostOnly,
    moveStory: hostOnly,
    removeStory: hostOnly,
    restoreStory: hostOnly,
    deleteStory: hostOnly,
    activateStory: hostOnly,
    startRound: hostOnly,
    reveal: hostOnly,
    startTimer: hostOnly,
    stopTimer: hostOnly,
    endRoom: hostOnly,

    close: shutdown,

    async forget() {
      shutdown();
      await store.deleteRoom(roomId);
    },
  };
}
