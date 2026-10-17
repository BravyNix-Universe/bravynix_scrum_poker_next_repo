# Architecture

The app follows Clean Architecture. Source code depends only inwards: business rules know nothing about React, Next.js, the browser, PeerJS or storage. This keeps the rules testable in isolation and lets the room referee move to a server later without a rewrite (SDD section 9, ADR-09).

```text
 UI (app, features, components) ──► composition ──► infrastructure
        │                                │                 │
        ▼                                ▼                 │
   application ◄─────────────────────────┴─────────────────┘
        │
        ▼
     domain        (every layer may also use domain directly)
```

Arrows show which way imports may point. The application layer declares ports (interfaces) for what it needs from the outside world; infrastructure implements them; composition plugs the implementations in.

## Layers

| Layer          | Folder                                                                                           | Holds                                                                                                                                  | May import                                              |
| -------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Domain         | `src/domain`                                                                                     | Pure rules and types: deck, results and rounding, limits, lifecycle, room ID and link formats, "My rooms" entry                        | `domain` only                                           |
| Application    | `src/application`                                                                                | Use cases (`room/*`), the room referee (`referee/*`), live sessions (`live/*`), sync and protocol, and the ports they need (`ports/*`) | `domain`, `application`                                 |
| Infrastructure | `src/infrastructure`                                                                             | Adapters that implement ports with platform APIs: Web Crypto, Web Storage, IndexedDB, PeerJS, the preview room session                 | `domain`, `application`, `infrastructure`               |
| Composition    | `src/composition`                                                                                | The composition root: picks an adapter for each port and builds use cases                                                              | everything except UI                                    |
| UI             | `src/app` (routes), `src/features` (feature screens and hooks), `src/components` (shared UI kit) | React and Next.js code                                                                                                                 | `domain`, `application`, `composition`, `lib`, `config` |

Supporting folders: `src/lib` (UI helpers such as `cn` and hooks), `src/config` (site settings), `src/test` (test setup and fakes, for tests only).

## Where the SDD modules go

| SDD module                                     | Layer and folder                                                                    |
| ---------------------------------------------- | ----------------------------------------------------------------------------------- |
| `rules`                                        | `src/domain/rules`                                                                  |
| `protocol` (messages, versions, schema checks) | version in `src/domain/protocol`, messages and checks in `src/application/protocol` |
| `referee`                                      | `src/application/referee` (a pure function, see below)                              |
| `host` and `participant-client`                | `src/application/live` (see Live rooms)                                             |
| `sync` (signed state, patches)                 | `src/application/sync`                                                              |
| `room-session`                                 | `RoomSession` port in `src/application/ports`, driven by a UI hook                  |
| `crypto`                                       | port in `src/application/ports`, adapter in `src/infrastructure/crypto`             |
| `storage`                                      | port in `src/application/ports`, adapters in `src/infrastructure/storage`           |
| `transport` (PeerJS)                           | port in `src/application/ports`, adapter in `src/infrastructure/transport`          |
| `avatars`                                      | manifest in `src/domain/avatars`, SVG files in `public/avatars`                     |
| `ui`                                           | `src/app`, `src/features`, `src/components`                                         |

## Room referee

`src/application/referee/referee.ts` is the single authority for stories, rounds, votes, reveal, the timer and the room's state (PRD FR-029, SDD 9). It is one pure function:

```ts
applyCommand(state, actorId, command, { now, newId }); // → { ok: true, state } | { ok: false, refusal }
```

- `RoomCommand` (`room-command.ts`) lists everything a device can ask for: join, profile changes, story queue edits, rounds, votes, reveal, timer and ending the room. Host commands from anyone else are refused with `not-host`; an ended room accepts only joins and presence changes.
- Votes are sealed. `cast-vote` records only that someone voted. After `reveal`, each voter sends `open-vote` with their card, and `finish-reveal` builds the round's outcome once every vote is open or the reveal deadline passes. Values never exist in the room state before reveal.
- Switching story, restarting a round or ending the room cancels a voting round: its votes are discarded and it keeps its number in History.
- `RoomState` (`room-state.ts`) is the whole room record; `toRoomView` in `application/room/room-view.ts` turns it into what one device may see.

Because it has no I/O, the same function runs in the host's browser, in the preview session, and could run on a server later (ADR-09).

## Room sessions

The UI talks to a room only through the `RoomSession` port. `openRoomSession` in `src/composition/services.ts` picks one of three implementations:

- `createHostRoomSession` (`application/live/host-room-session.ts`) on the device that holds the room key.
- `createParticipantRoomSession` (`application/live/participant-room-session.ts`) everywhere else.
- `createPreviewRoomSession` (`infrastructure/preview/preview-room-session.ts`) when built with `NEXT_PUBLIC_ROOM_MODE=preview`. It runs every command through the real referee in the tab, with simulated teammates who join, vote and open their votes on reveal, and a simulated host when you join as a participant.

`resolveRoomRole` decides host or participant. A host link (`#<roomId>&h=<key>`) saves the key on this device, and the address bar is then rewritten to the plain invite link so the key doesn't linger in history or get shared by accident. Later visits find the key in storage.

## Live rooms

The host's browser is the hub (SDD 9): it registers the PeerJS ID `bvx-<roomId>`, runs the referee, and is the only device that changes the room. Participants connect to it and keep a signed copy.

```text
participant                                  host
    │ hello {protocol, nonce}                  │
    │ ───────────────────────────────────────► │
    │ welcome {publicKey, proof, snapshot}     │  proof = signature over the nonce
    │ ◄─────────────────────────────────────── │
    │ join {participantId, token, profile}     │  host keeps only the token's hash
    │ ───────────────────────────────────────► │
    │ patch {version, changes, signature}  ... │  every change, signed
    │ ◄─────────────────────────────────────── │
```

- **Trust.** A participant checks that the host's public key matches the room (`isRoomKey`) and that the proof signs its own nonce; otherwise it stops with "host-unverified". The host signs every state version. Patches carry only what changed, but the signature covers the whole state after the patch, so a participant that applies a patch out of order or gets a bad signature asks for a fresh snapshot instead.
- **Saved before acknowledged.** The host saves each new version, then broadcasts the patch, then answers the requests that caused it. A refresh never loses an acknowledged change.
- **Sealed votes (FR-013).** A vote is sent as a seal: SHA-256 over the room, round, participant, card and a random 16-byte salt (`live/vote-seal.ts`). The device keeps the card and salt; when the host reveals, each device opens its vote and the host checks it against the seal. Votes not opened within the reveal deadline count as "not revealed". If a voter changes their card just as the host reveals, the device opens whichever of its last two votes matches the seal the host holds.
- **Identity.** Each person is a random participant ID plus a 32-byte token kept on their device. A refresh rejoins as the same person, never a duplicate.
- **Host recovery (SDD 11.6).** The host link on a new device saves the key and shows "Restoring your room". The first participant to reconnect offers its signed copy; the host verifies it and carries on from there.
- **One host at a time (FR-046).** If the hub ID is taken, the host retries a few times (an old tab may still be closing) and then shows "This room is open in another tab or device".
- **Limits.** Each participant's requests are rate limited (10 a second, bursts of 20) and deduplicated; a link that keeps breaking the rules is closed. Messages are capped at 16 KB, except an offered room copy (4 MB). Both sides send a heartbeat every 5 seconds and drop a link that has been silent for 20. Reconnects back off from 1 to 30 seconds. Participants correct the timer for the difference between their clock and the host's.

`protocol/messages.ts` lists every message; `protocol/parse-messages.ts` checks everything the host receives field by field, and drops what doesn't fit. Live timings are in `live/live-timing.ts`; tests pass shorter ones.

## Storage

The `RoomStore` port (`application/ports/room-store.ts`) keeps, per room: the room record (the host's full state, or a participant's signed copy), the host key, this device's identity, and its sealed vote. `infrastructure/storage/indexed-db-room-store.ts` implements it with IndexedDB (database `bravynix-poker`, one object store each). Every entry carries the room's expiry, and expired rooms are deleted on each page load. Where IndexedDB is unavailable, such as some private windows, rooms fall back to memory for the life of the tab. "My rooms" and profile preferences stay in Web Storage.

## Transport

The `PeerTransport` port (`application/ports/peer-transport.ts`) has two operations: `openHub` for the host and `connect` for a participant. `infrastructure/transport/peerjs-transport.ts` implements it with PeerJS, loaded on demand so it isn't in any page's first download. It maps PeerJS errors to the failures the screens explain ("service-unreachable", "hub-taken", "host-offline", "host-unreachable", "unsupported"), splits long messages into frames, and reports whether a link is direct or relayed. `NEXT_PUBLIC_PEER_*` settings point it at a self-hosted PeerServer; without them it uses PeerJS cloud.

## Connection states

`RoomSessionState` (`src/application/room/room-session-state.ts`) is everything the room screen can show:

| Status             | Screen                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| `connecting`       | "Connecting to the room…"                                                                              |
| `restoring`        | "Restoring your room": the host on a new device, waiting for a participant's copy                      |
| `waiting-for-host` | "Waiting for the host to open the room", retried automatically                                         |
| `lobby`            | The join screen                                                                                        |
| `joined`           | The room, with `connection` (`connected`, `reconnecting`, `host-away`) and the latest refusal `notice` |
| `failed`           | A page for the `SessionProblem`, with Try again (`RoomSession.retry`) or Refresh                       |
| `unavailable`      | The neutral "This room isn't available"                                                                |

- `connection` drives the banner under the top bar and the deck: `reconnecting` disables voting with "Reconnecting: your vote isn't recorded yet" (FR-057), and `host-away` pauses it (FR-047).
- A refused command sets `notice` (`{ id, refusal }`); `features/room/refusal-messages.ts` maps each `Refusal` to the PRD 8.7 wording, shown as a toast.
- `RoomSession.getDiagnostics()` feeds the Connection details dialog (FR-053). `formatDiagnostics` builds the "Copy diagnostics" text from connection facts only, never room content or keys.
- The preview session also implements `RoomSessionSimulation` (`ports/room-session-simulation.ts`) to act out each state on request. The UI checks for it with `canSimulate` and shows the controls only in preview.

## Accessibility

- `RoomAnnouncer` reads room changes to screen readers without moving focus (PRD 8.6). `features/room/announcements.ts` turns two snapshots of the room into words (connection loss and recovery, story and round changes, the revealed result, this device's vote). Vote counts go to a separate live region, throttled to one update every 5 seconds so a full room doesn't flood it. The timer announces its own warnings.
- Banners under the top bar sit in a labelled "Room notices" region, so every part of the page is inside a landmark.
- Pages that replace the room after a failure move focus to their heading.

## Enforcement

`npm run lint` fails when a dependency points the wrong way (`eslint.config.mjs`):

- `import/no-restricted-paths` enforces the layer table above, including relative imports.
- `domain` and `application` may not import React, Next.js or PeerJS, or use platform globals such as `window`, `localStorage`, `indexedDB`, `crypto` or `fetch`.
- `infrastructure` and `composition` may not import React or Next.js.
- UI code may not import `infrastructure` directly; it gets services from `@/composition/services`.
- Shared components in `src/components` may not import features, routes or composition.
- Nothing outside tests may import `src/test`.

## Adding a capability

1. Put the rule in `src/domain` with unit tests.
2. Write the use case in `src/application`. If it needs the outside world, declare a port (an interface) in `src/application/ports`.
3. Implement the port in `src/infrastructure` and test the adapter.
4. Wire it in `src/composition/services.ts`.
5. Call it from a hook in `src/features/<feature>` and render it with components.

## Testing

- Domain: plain unit tests, no mocks needed.
- Application: unit tests with fakes for ports (see `src/test/fakes`). `live/live-room.test.ts` runs real host and participant sessions against each other over an in-memory network (`src/test/fakes/in-memory-network.ts`) with real Web Crypto: joining, sealed votes, refreshes, the host stepping away, restoring on a new device, a second host tab, impostors and forged messages.
- Infrastructure: tests against the real platform API in Node or jsdom.
- UI: Testing Library tests through the real composition root. `src/test/fakes/room-builder.ts` builds rooms by running commands through the referee, so screen tests use real room states.
