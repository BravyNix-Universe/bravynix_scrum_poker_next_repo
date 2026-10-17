# Stitch design review (against PRD v1.1)

Source: Stitch project "Bravynix Scrum Poker Web UI", 13 desktop screens, exported to `design\` in the repo, plus the design system in `design\DESIGN.md`.

## Verdict

The design is a strong match for the PRD's core flow and visual direction. Landing with "My rooms", the room-created dialog with participant and host links, join with optional name and avatar, Discuss → Estimate → Review, sealed "voted / thinking" status, a reveal confirmation, results with numeric / ? / not voted / not revealed counts, a stories drawer, history, the timer and the error states are all there, and most copy matches the PRD word for word.

The problems are mostly AI-generated filler that contradicts the PRD (Jira sync, exports, a coffee card, "consensus" labels, ticket numbers and descriptions), plus a few screens the PRD needs that aren't drawn yet.

## Decisions for you

1. **Phones.** The "Small Screen Notice" blocks screens under 1024px, but PRD 8.4 and goal 4 require joining and voting on mobile.
   - a) Participants can join and vote on phones with a simple stacked layout, and only hosting needs a laptop **(recommended)**
   - b) Desktop only for V1, as drawn (needs a PRD change)
2. **Avatars.** The design uses emoji (🐼 🐯 🦊 and objects like 💻 🚀). Emoji look different on Windows, Android and iOS, and the set includes objects, while the PRD asks for people across skin tones plus cute animals.
   - a) Bundle a consistent, openly licensed SVG emoji set (for example Noto Emoji) so every device looks the same, limited to about 20 people and animals **(recommended)**
   - b) Use the device's native emoji as drawn
3. **Header links "Documentation & guide" and "GitHub & open source".** Is the project open source, and will there be a docs page?
   - a) Remove both for V1 **(recommended)**
   - b) Keep them (tell me the targets)
4. **Which "Room created" screen?** There are two. The first exported almost empty (header and footer only), so I'll use the second unless you say otherwise.

## Contradicts the PRD: I'll change these unless you object

| Where | Design shows | PRD says | Change |
| --- | --- | --- | --- |
| Every room screen | Story description, ticket key (CK-9204, PROD-4091), tags, "Priority: High", "Figma spec attached" | Story title only (FR-010) | Show title only |
| History, stories drawer, review | "Import from Jira / Linear", "Live synced to Jira / Linear", "Auto-sync on", "Export CSV", "Export round", "Copy summary", "Share session recap" | No integrations, no exports (7.2) | Remove |
| Join, review, reconnecting, room created | ☕ card; 21 instead of 20; deck missing ½, 20 or ? | Exactly 0, ½, 1, 2, 3, 5, 8, 13, 20, ? (FR-011) | Use the exact deck everywhere |
| Landing, history, review, stories drawer | "Consensus high", "Consensus check", "Quorum reached (75%)", phase "3. Consensus / Finalize", "Accept & Next" | Never decide consensus or accept an estimate (4.1, 11.3) | "Most common: 5", "Spread 2–8"; button "Next story" |
| Several screens | Phases "Vote / Reveal / Review", "Vote / Review / Finalize", "Voting / Reveal / Consensus" | Discuss / Estimate / Review (8.3) | Use Discuss / Estimate / Review everywhere |
| Room full state | "Join as observer only", "Ask the host to make space" | No observer mode or participant removal (7.2) | "This room is full (50 people)." with Try again only |
| Review | Roles under names ("Frontend", "QA Lead"), "Spectating", "Passed", "abstained", "Click any participant to request clarification" | No roles; states are voted / not voted / not revealed | Remove roles; use PRD states |
| Landing FAQ | "The room stays open and votes remain intact" if the host leaves; "no limits on rooms or participants"; "without performance degradation" | Voting pauses while the host is away; 50-person cap; no performance promise | Rewrite the FAQ answers to match the PRD |
| Footers, reconnecting, states | "End-to-end synced", "Websocket #12", "Websocket handshake refused", "Sync packet timed out", "Host heartbeat", "P95 SLA < 140ms" | Plain language; no security claims beyond the privacy notice | "Connected" / "Reconnecting"; no "end-to-end" claim |
| Landing headline | "Scrum planning poker in one link" | Product is Scrum Poker; "Planning Poker" is a trademark | "Scrum Poker in one link" |
| Reconnecting | Host shown as "Voted ?" | No vote value before reveal (FR-013) | Show only "Voted" |
| Room IDs | "#CK-9204" | 12-character random IDs | Use the real format |

## PRD screens or states not designed yet

I'll build these in the same visual language unless you'd rather design them first:

- Host "Add story" (missing from the stories drawer and the Discuss screen), "Delete" for stories with no rounds, and "Restore" for removed stories
- Empty room: no stories yet (host prompt; participant "Waiting for the host to add a story")
- "Revealing…" moment, and "No numeric estimate" when every vote is ?
- Cancelled round in History ("Round n: cancelled, not revealed") and history for several rounds of one story
- Room ended (read-only)
- Host-only states: "This room is open in another tab or device" and the "room tab hidden" warning
- "Couldn't verify the host", "Can't reach the connection service" and "A newer version of Bravynix is available. Please refresh."
- Waiting for the host to open the room (a participant arriving before the host)
- Diagnostics panel (P1)
- Privacy notice page
- Rename / name-and-avatar edit after joining

## What matches well

- Room-created dialog: participant link, private host link with the exact PRD warning, the laptop advice and a copy confirmation
- Join: optional name, "None" avatar, "Remember my name and avatar on this device" (off), and a "Session expires in 23h 48m" countdown (which also covers the mid-meeting-expiry concern)
- Review: average 4.6 with numeric / ? / not voted / not revealed counts, and a distribution in deck order
- Dialogs: early-reveal warning naming who hasn't voted, "Switch story and cancel this round?", and "End this room?" with the deletion time
- Timer: presets of 1, 2, 3 and 5 minutes plus a custom 00:30–30:00, matching D-07
- States: "Waiting for the host", "Can't connect to the host from this network", "This room is full (50 people)" and the neutral "This room isn't available"

## Build notes (no decision needed)

- The Stitch HTML uses the Tailwind CDN, Google Fonts and Material Symbols at runtime. I'll port the design tokens into the app's Tailwind setup, self-host the fonts (Bricolage Grotesque, Noto Sans) through `next/font` and bundle the icons, so the page loads nothing from third parties (PRD 14.3 CSP).
- The design is light-mode only, so V1 will be light-only unless you want dark mode.
