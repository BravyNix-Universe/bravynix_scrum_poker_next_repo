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

| Layer          | Folder                                                                                           | Holds                                                                                                                           | May import                                              |
| -------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Domain         | `src/domain`                                                                                     | Pure rules and types: deck, results and rounding, limits, lifecycle, room ID and link formats, "My rooms" entry                 | `domain` only                                           |
| Application    | `src/application`                                                                                | Use cases (`room/create-room.ts`) and the ports they need (`ports/*`)                                                           | `domain`, `application`                                 |
| Infrastructure | `src/infrastructure`                                                                             | Adapters that implement ports with platform APIs: Web Crypto, Web Storage, the preview room session; later IndexedDB and PeerJS | `domain`, `application`, `infrastructure`               |
| Composition    | `src/composition`                                                                                | The composition root: picks an adapter for each port and builds use cases                                                       | everything except UI                                    |
| UI             | `src/app` (routes), `src/features` (feature screens and hooks), `src/components` (shared UI kit) | React and Next.js code                                                                                                          | `domain`, `application`, `composition`, `lib`, `config` |

Supporting folders: `src/lib` (UI helpers such as `cn` and hooks), `src/config` (site settings), `src/test` (test setup and fakes, for tests only).

## Where the SDD modules go

| SDD module                                     | Layer and folder                                                           |
| ---------------------------------------------- | -------------------------------------------------------------------------- |
| `rules`                                        | `src/domain/rules`                                                         |
| `protocol` (messages, versions, schema checks) | `src/domain/protocol`                                                      |
| `referee`, `participant-client`                | `src/application` (pure state machines behind ports)                       |
| `room-session`                                 | `RoomSession` port in `src/application/ports`, driven by a UI hook         |
| `crypto`                                       | port in `src/application/ports`, adapter in `src/infrastructure/crypto`    |
| `storage`                                      | port in `src/application/ports`, adapters in `src/infrastructure/storage`  |
| `transport` (PeerJS)                           | port in `src/application/ports`, adapter in `src/infrastructure/transport` |
| `avatars`                                      | manifest in `src/domain/avatars`, SVG files in `public/avatars`            |
| `ui`                                           | `src/app`, `src/features`, `src/components`                                |

## Preview room session

Until the PeerJS transport lands (Phase 5), `src/infrastructure/preview/preview-room-session.ts` implements the `RoomSession` port inside the browser tab with simulated teammates. The UI only sees the port, so swapping in the live session is a change to `src/composition/services.ts` alone.

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
- Application: unit tests with fakes for ports (see `src/test/fakes`).
- Infrastructure: tests against the real platform API in Node or jsdom.
- UI: Testing Library tests through the real composition root.
