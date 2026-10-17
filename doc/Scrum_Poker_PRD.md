# Bravynix Scrum Poker - V1 Product Requirements Document

**Version:** 1.1  
**Status:** Product baseline for UX and engineering, aligned with System Design Document v1.0  
**Prepared:** 16 October 2026 (v1.0); revised 16 October 2026 (v1.1)  
**Product owner:** Bravynix (bravynix.com); named individual to be confirmed  

> **Product promise:** Share one link, estimate together in seconds, and leave no account or permanent history behind. Room data never touches a Bravynix server.

Items marked **[Default]** are decisions applied so that the document is buildable. They are the product owner's to confirm or change, and all of them are listed in section 22.

## Contents

- [0. Change log](#0-change-log)
- [1. Document control](#1-document-control)
- [2. Executive summary](#2-executive-summary)
- [3. Problem, opportunity, and product vision](#3-problem-opportunity-and-product-vision)
- [4. Goals and success measures](#4-goals-and-success-measures)
- [5. Target users and personas](#5-target-users-and-personas)
- [6. Confirmed decisions and assumptions](#6-confirmed-decisions-and-assumptions)
- [7. Scope](#7-scope)
- [8. UX and UI requirements](#8-ux-and-ui-requirements)
- [9. Primary user flows](#9-primary-user-flows)
- [10. Functional requirements](#10-functional-requirements)
- [11. Calculation and voting rules](#11-calculation-and-voting-rules)
- [12. Room lifecycle and real-time state](#12-room-lifecycle-and-real-time-state)
- [13. Data model](#13-data-model)
- [14. Security, privacy, and abuse prevention](#14-security-privacy-and-abuse-prevention)
- [15. Retention and deletion](#15-retention-and-deletion)
- [16. Edge cases and required behaviour](#16-edge-cases-and-required-behaviour)
- [17. Non-functional requirements](#17-non-functional-requirements)
- [18. Acceptance criteria and test scenarios](#18-acceptance-criteria-and-test-scenarios)
- [19. Testing and release readiness](#19-testing-and-release-readiness)
- [20. Risks and future roadmap](#20-risks-and-future-roadmap)
- [21. UX handoff summary](#21-ux-handoff-summary)
- [22. Open decisions and defaults applied](#22-open-decisions-and-defaults-applied)
- [Appendix A. Short glossary](#appendix-a-short-glossary)

## 0. Change log

Version 1.1 aligns the PRD with the product owner's architecture decisions of 16 October 2026 and the System Design Document (SDD) v1.0. It also closes the findings of the v1.0 quality audit.

| Area | v1.0 | v1.1 | Source |
| --- | --- | --- | --- |
| Architecture | A server is authoritative and stores session data | No server. The host's browser runs the room ("room referee"), and participants connect to it peer-to-peer. Each device keeps its own copy | Owner decision; SDD ADR-01, ADR-02 |
| Retention | Ended rooms deleted 24 h after ending; abandoned rooms expire after 24 h of inactivity | Every room is deleted 24 h after it was created, on every device. Ending early makes it read-only until then | Owner decision; SDD ADR-07; audit M-09 |
| Host control | Host token; recovery path undecided | A unique host link per room, shown once. One active host device or tab at a time | Owner decision; audit H-02; SDD ADR-06, ADR-11 |
| Host away | Session continues | Voting pauses until the host returns; history stays readable | SDD ADR-02 |
| Vote privacy | Server withholds vote values | Sealed votes: only a seal is sent before reveal. New "not revealed" result category | SDD ADR-05 |
| Story and round lifecycle | Partly defined | Story states; new round states REVEALING and CANCELLED; Discuss state; rename, delete and restore rules | Audit H-01 |
| Roster and capacity | "Connected" and "active" undefined; 50 participants | Roster, online status and expected voters defined. 50 people including the host; room-full behaviour | Audit M-01; owner decision |
| Timer | Start and expiry only | Bounds, controls and interactions defined | Audit M-03 |
| Profiles | Optional name and avatar | Name limits; about 20 built-in avatars (people and animals); editing after joining | Audit M-04; owner decision |
| Landing page | Create session only | Explains the concept, offers Create room and lists "My rooms" on this device | Owner decision |
| Availability | 99.5% proposed | Best effort; depends on PeerJS cloud | SDD 14, 18 |
| Accessibility | WCAG 2.2 AA "where practical" | WCAG 2.2 AA required; live announcements | Audit M-05 |
| Acceptance criteria | Several P0 requirements without criteria | Every P0 requirement mapped to criteria in section 10 | Audit M-02 |
| Privacy | Generic | Agreed privacy-notice wording; IP-address visibility; on-device copies | SDD 13.5 |
| Governance | Assumptions without a status | Status column in 6.2; defaults listed in section 22 | Audit M-07 |

## 1. Document control

| Field | Value |
| --- | --- |
| Document | Bravynix Scrum Poker - V1 Product Requirements Document |
| Version | 1.1 |
| Status | Product baseline for UX and engineering; open decisions in section 22 |
| Prepared | 16 October 2026 |
| Product owner | Bravynix (bravynix.com); named individual to be confirmed |
| Companion documents | Bravynix Scrum Poker - System Design Document v1.0; audit of PRD v1.0 |
| Source inputs | Product decisions confirmed by the owner; two Planning Poker UI reference screenshots |
| Product integrations | None in V1; Jira integration deferred |
| Infrastructure services | Hostinger (website files), PeerJS cloud (connection set-up and relay), public STUN servers |

Status words used in this document:

- **Confirmed:** decided by the product owner.
- **Proposed:** applied to make V1 buildable; awaiting owner confirmation.
- **Retired:** no longer applies.

## 2. Executive summary

Bravynix Scrum Poker is a free, public, browser-based planning poker tool for software teams, used mainly in India. A host creates a room for one Epic on bravynix.com, adds stories before or during the meeting, and shares one link. Up to 50 people, including the host, join without accounts. Each can optionally pick a display name and one of about 20 built-in avatars, and votes privately with a Fibonacci-style deck. The host reveals the votes, and the app shows individual votes, the distribution, the average of numeric votes and the round-by-round history.

No Bravynix server stores room data. The website is a set of static files. Each room runs in the host's browser, and participants connect to it directly, peer-to-peer. Every device keeps its own copy of the room and deletes it 24 hours after the room was created.

The owner has accepted the costs of this design:

- voting pauses while the host's browser is closed or offline;
- some restrictive networks may fail to connect;
- there is no availability guarantee.

> **Product promise: Share one link, estimate together in seconds, and leave no account or permanent history behind. Room data never touches a Bravynix server.**

## 3. Problem, opportunity, and product vision

### 3.1 Problem statement

Teams often estimate stories using chat, spreadsheets, or tools that need accounts and setup. Facilitators need to see who has voted, reveal estimates together, discuss differences, record outcomes, and move to the next story. Account creation slows a meeting down, weak real-time behaviour undermines trust in the estimate, and many tools keep a team's data indefinitely.

### 3.2 Opportunity

Offer an intentionally small, fast, polished room focused on the estimation workflow: create an Epic room, join by link, vote privately, reveal on the host's command, review the result, and continue through multiple stories and rounds. Store nothing on servers.

### 3.3 Product vision

Make collaborative story-point estimation feel immediate and clear for any team, without accounts, credentials, setup, or anyone holding on to the team's data.

## 4. Goals and success measures

**Business objective:** offer a free, privacy-first planning poker website that teams can use without accounts, and without Bravynix storing their room data.

| Goal | Measure / target | How to validate |
| --- | --- | --- |
| Reduce setup friction | A first-time host creates a room and shares its link in under 60 seconds | Moderated usability tests |
| Make joining easy | A participant joins without an account and submits a vote within 60 seconds of opening a valid link, on desktop and mobile | Usability tests, including on Indian mobile networks |
| Protect private voting | Zero vote values reach any device other than the voter's before reveal, including the host's | Automated security tests that inspect every device |
| Keep teams synchronized | p95 of 500 ms or less for a vote-status or result update to reach online participants in a 50-person room (proposed) | 50-person load test and network pilot |
| Connect reliably | Every pilot participant connects on office Wi-Fi, a VPN, and Jio and Airtel mobile data, directly or through a relay [Default] | Network pilot |
| Preserve round history | All revealed votes and results stay available on each participant's device until the room is deleted | Persistence, reconnect and expiry tests |
| Respect temporary data | Every device deletes a room's data 24 hours after creation: at the deadline if the site is open, otherwise when the site is next opened | Expiry tests with simulated time |

The timing and connection targets are proposed launch targets, not measured performance. Validate them in the pilot before treating them as commitments.

**After launch.** V1 collects no product analytics or telemetry, which keeps the privacy promise simple. Outcomes are judged by the daily smoke test, support reports and periodic pilot sessions with real teams.

### 4.1 Non-goals

- Replacing Jira or a team's work tracker.
- Providing a permanent archive of estimates or cross-session analytics.
- Storing room data on a Bravynix server.
- Authenticating a real-world identity, or proving that one browser represents one person.
- Providing project management, sprint planning, backlog prioritization, or task tracking beyond a single Epic room.
- Automatically deciding team consensus or silently rounding the average to a card value.

## 5. Target users and personas

| Persona | Needs | Expected actions |
| --- | --- | --- |
| Host / facilitator | Start quickly, guide the session, keep the story queue organized, control reveal and the timer, and end the room | Create a room; enter the Epic name; add, reorder and rename stories; reveal; start new rounds; manage the timer; end the room |
| Participant | Join easily, vote without social pressure, see when others have voted, and understand the result after reveal | Open the link; optionally choose a name and avatar; submit or change a vote before reveal; review revealed cards and history |
| Late-joining participant | Join an ongoing meeting without disrupting the current round | Join an active room; vote if the current round is still open; otherwise review and vote in the next round |

A host is also a participant and may vote. The host sees their own selection but must not be able to see anyone else's vote before reveal.

The host's browser runs the room. For rooms of more than about 15 people, the host should use a laptop or desktop and keep the room tab open for the whole meeting.

## 6. Confirmed decisions and assumptions

### 6.1 Confirmed by the product owner

| Area | Confirmed decision |
| --- | --- |
| Access | No login, accounts, passwords, or participant credentials. |
| Architecture | No backend. The website is static files on Hostinger. Each room runs in the host's browser, and participants connect to it peer-to-peer using PeerJS. PeerJS cloud introduces browsers to each other and relays traffic when a direct connection fails (16 Oct 2026). |
| Relay | Use PeerJS's relay in V1. Add Cloudflare's relay only if the pilot shows it's needed (16 Oct 2026). |
| Users | A free public website; users mainly in India. |
| Landing page | bravynix.com explains the concept, and hosts create rooms there (16 Oct 2026). |
| Room links | Random room IDs generated in the browser, for example `bravynix.com/r/k7Qx9mP2vT4w` (16 Oct 2026). |
| Host link | Each room has its own unique host link, separate from the participant link (16 Oct 2026). |
| Room structure | One room represents one Epic and holds up to 500 stories. |
| Room size | Up to 50 people, including the host (16 Oct 2026). |
| Story fields | Story title only in V1. |
| Story creation | The host can add stories before participants join or while the room is running. |
| Participant identity | Name and avatar are optional. If both are omitted, show "Anonymous" with no avatar. |
| Avatars | About 20 built-in avatars: people (male and female, across skin tones) and cute animals such as a panda and a tiger. Bundled with the website; no uploads (16 Oct 2026). |
| Identity persistence | A temporary browser-scoped identity per room, so a refresh usually restores the same participant. |
| Host permissions | The host controls the room, stories, rounds, timer and reveal. Other participants can vote and view results and history. The host can also vote. |
| Voting visibility | Vote values stay hidden until the host reveals. Who has voted may be shown before reveal. |
| Cards | 0, 1/2, 1, 2, 3, 5, 8, 13, 20, and ? |
| Result | The average is calculated from numeric votes only and keeps decimals. ? votes, non-voters and unrevealed votes are shown separately. |
| Rounds | Every round is preserved; a re-vote starts a fresh round and never overwrites earlier ones. |
| Timer | An optional countdown controlled by the host. |
| History | All revealed votes, averages and participant display identities are kept until the room's data is deleted. |
| Retention | Each room's data is cleared 24 hours after the room was created, independently of other rooms. Ending early makes the room read-only until then (16 Oct 2026). |
| Integration | Jira integration is deferred beyond V1. |
| UI direction | Use the reference screenshots as layout inspiration: a central story workspace, participant and voting status, the card deck along the bottom, and a right-side results and history panel. |

### 6.2 Assumptions

| ID | Assumption / behaviour | Status | Reason / impact |
| --- | --- | --- | --- |
| A-01 | The host may reveal once at least one vote has been cast. If any expected voter (12.4) hasn't voted, show a warning and ask for confirmation. | Proposed | Avoids blocking a meeting while keeping early reveal intentional. |
| A-02 | A vote can be changed while the round is VOTING. Reveal closes the round; voting again needs a new round. | Proposed | Common planning-poker behaviour; consistent history. |
| A-03 | Someone who joins during VOTING may vote in that round. Someone who joins after reveal can view results but can't vote in the closed round. | Proposed | Predictable late-join handling. |
| A-04 | The average is kept as whole half-points and displayed to at most two decimals, rounded half-up, with trailing zeros removed. It is never converted to a card. | Proposed | Exact arithmetic and a single display rule. |
| A-05 | The timer is off by default and never reveals votes. Full rules are in 12.5. | Proposed | Preserves host-only reveal. |
| A-06 | Inactivity-based expiry. | Retired | Replaced by deletion 24 hours after creation (FR-023). |
| A-07 | A unique host link per room carries the host key after `#`, which browsers never send to a server. Losing both the host link and the original browser means losing host control. | Confirmed | There is no account-based recovery. |
| A-08 | Browser identity is scoped to a room and a browser profile. Clearing site data, private browsing or switching devices creates a new participant, and the app can't tell it is the same person. | Proposed | Honest limit of no-login identity. |
| A-09 | Story rename, reorder, remove, restore and delete follow the story states in 12.2. | Proposed | Closes audit H-01. |
| A-10 | At most 50 people online in a room (host included) and 500 stories, enforced by the host's browser and validated by a load test. | Confirmed | Capacity of the host's device. |
| A-11 | A voter's display name and avatar are snapshotted when the round is revealed, so History stays stable if they change their name later. | Proposed | Stable history. |
| A-12 | Anyone with the participant link can join while the room is active. V1 has no allow-list, observer role, participant removal or link rotation. | Proposed | Smallest coherent permission model. |
| A-13 | Voting pauses while the host's browser is closed or offline; participants can still read history. | Confirmed | Accepted cost of having no server. |
| A-14 | A vote whose owner is offline at reveal, past the reveal deadline, shows as "not revealed". | Confirmed | Accepted cost of sealed votes. |
| A-15 | Only one device or tab can host a room at a time. | Proposed | Avoids two hosts disagreeing about the order of events. |
| A-16 | V1 collects no product analytics or telemetry. | Proposed | Keeps the privacy promise simple. |
| A-17 | Beta usage of tens of rooms a day, and no rule that data must stay in India. | Proposed | Bravynix has no server load either way; affects only the check of PeerJS cloud's terms. |

## 7. Scope

### 7.1 In scope for V1

- A landing page at bravynix.com that explains the concept, offers Create room with a required Epic name, and lists "My rooms" on this device.
- A unique participant link and a separate host link per room, generated in the host's browser.
- Joining from a desktop or mobile browser with an optional display name and built-in avatar, changeable later.
- Adding, renaming, reordering, activating, removing, restoring and (if never estimated) deleting stories.
- A live roster with online status and vote status.
- Sealed voting, changing a vote before reveal, explicit host reveal, and an optional reveal animation (P1).
- Results: average, numeric-vote count, ? count, not-voted count, not-revealed count, distribution and individual votes.
- Multiple preserved rounds per story and a History view.
- An optional host-controlled timer that never reveals votes.
- Automatic reconnection, and host recovery through the host link.
- Ending a room (read-only), and automatic deletion on every device 24 hours after creation.
- A responsive, accessible desktop and mobile experience.
- An in-app connection diagnostics panel (P1).

### 7.2 Out of scope for V1

- Jira import, Jira ticket links as structured fields, or writing estimates back to Jira.
- Login, accounts, organizations, user profiles, SSO, or roles beyond host and participant.
- Server-side storage of room data, server-side backups, permanent rooms, cross-session history, downloads or exports, and analytics dashboards.
- Product analytics and third-party error-reporting services.
- AI-generated estimates, consensus recommendations, or automatic rounding to a card.
- Story descriptions, acceptance criteria, attachments, comments, dependencies, or sprint assignment.
- Voting by email, offline voting, observer mode, co-hosts, hosting from several devices at once, host transfer, participant removal, link rotation, and account-based recovery.

## 8. UX and UI requirements

The Planning Poker screenshots inspire the information hierarchy and interaction; they are not a pixel-perfect specification. Use an original visual design and branding.

### 8.1 Landing page (bravynix.com)

- The product promise and a short explanation of how it works: one link, private votes, and automatic deletion after 24 hours, with nothing stored on Bravynix servers.
- A Create room form with a required Epic name.
- A "My rooms" list of the rooms this device created or joined, showing Epic name, role (host or participant) and time left, with Open and "Delete from this device" actions. Expired rooms never appear.
- A link to the privacy notice.

### 8.2 After creating a room

- The participant link with a Copy action and a copy confirmation.
- The host link, shown once, with a Copy action and this warning: "Anyone with this link controls the room. Keep it private. You'll need it to host from another device."
- Advice to keep this tab open during the meeting, and to use a laptop or desktop for rooms of more than about 15 people.

### 8.3 Desktop layout

- **Top bar:** product identity, Epic name, invite/share action, host room controls, optional timer, and a connection-status indicator that opens the diagnostics panel.
- **Central workspace:** current story title, story position and queue controls, round status, and a Discuss / Estimate / Review indicator (Discuss = story active with no round; Estimate = VOTING or REVEALING; Review = REVEALED).
- **Participant area:** avatars or anonymous placeholders with online and "voted / waiting" status. Before reveal, never show anyone else's vote value.
- **Card deck:** distinct selectable cards along the bottom of the work area, with an obvious selected state.
- **Right-side panel:** the current result and distribution after reveal, plus a History list with story title, round number, average and drill-down votes.

### 8.4 Mobile layout

- Keep the current story and voting controls prominent without horizontal page scrolling.
- Move the results and history area into tabs, a drawer, or a stacked panel.
- Make cards large enough to tap accurately, with no reliance on hover.
- Keep host controls identifiable and visually separate from vote selection.

### 8.5 States and animation

| State | Required UI behaviour |
| --- | --- |
| No stories yet | Host: an add-story prompt. Participant: "Waiting for the host to add a story." |
| Discuss | Story title shown; card deck disabled; host sees Start estimation. |
| Waiting for votes | Roster and submission progress; others' vote values remain hidden. |
| My vote selected | Highlight the chosen card and confirm "Your vote is recorded" once the host acknowledges it. Allow changes until reveal. |
| Revealing | Brief "Revealing…" state while votes are opened (at most the reveal deadline). |
| Results revealed | Each revealed vote, average, numeric-vote count, ? count, not voted, not revealed and distribution. The reveal animation is optional (FR-035) and must respect reduced motion. |
| No numeric votes | "No numeric estimate", the ? count, and anyone who didn't vote or wasn't revealed. |
| Waiting for the host | Shown to participants while the host is away. Voting is paused, history stays readable, and reconnection is automatic. |
| Reconnecting | Connection status shown; card deck disabled with "Reconnecting: your vote isn't recorded yet". |
| Couldn't verify the host | The room's host couldn't prove its identity, so no join takes place. |
| Can't connect | Separate messages for "Can't reach the connection service" and "Can't connect to the host from this network", each with a diagnostics link and the suggestion to try another network. |
| Room full | "This room is full (50 people)." |
| Open elsewhere | Host only: "This room is open in another tab or device." |
| Host tab hidden | Host only: a warning that participants may be affected while the room tab is in the background. |
| Outdated app | "A newer version of Bravynix is available. Please refresh." |
| Room ended | Read-only view with no voting or host actions. |
| Room expired or unavailable | A neutral "This room isn't available" message that doesn't reveal whether the room ever existed. |

### 8.6 Accessibility

- All surfaces must conform to WCAG 2.2 Level AA. Any exception needs product-owner approval and must be listed in this document.
- Selection and voting status must not rely on colour alone.
- Cards must work by keyboard and expose an accessible name and value.
- Vote-status changes, reveal results, timer warnings and expiry, and connection loss and recovery must be announced to assistive technology without moving focus. Vote-status announcements are batched so they don't flood a 50-person room.
- Respect prefers-reduced-motion; the reveal must make sense without animation.
- Provide visible focus states, adequate tap targets, and readable timer and status text.

### 8.7 Messages for refused actions

| Situation | Message |
| --- | --- |
| Vote after the round closed | "Voting for this round has closed." |
| Card value not in the deck | "That card isn't available." |
| A participant attempts a host action | "Only the host can do that." |
| Too many messages from one participant | "You're sending changes too quickly. Please wait a moment." |
| Room full | "This room is full (50 people)." |
| Room expired | "This room isn't available." |
| App version mismatch | "A newer version of Bravynix is available. Please refresh." |
| 500 stories reached | "This room has reached its limit of 500 stories." |

## 9. Primary user flows

### 9.1 Host creates a room

1. The host opens bravynix.com, reads how it works, enters an Epic name and selects Create room.
2. The host's browser creates the room: room ID, host key, and creation time, with expiry set to 24 hours after creation. Nothing is sent to a Bravynix server.
3. The app shows the participant link and the host link (once), each with a Copy action, plus the host-link warning.
4. The host lands in the room workspace and can add stories immediately or later. The room appears in "My rooms" on this device.

### 9.2 Participant joins

1. The participant opens the participant link.
2. The app connects to the host's browser and checks the host's identity. If the host is offline it shows "Waiting for the host to open the room" and retries automatically.
3. The join view shows the Epic name and an optional display name and avatar. Both can be skipped, which gives Anonymous with no avatar.
4. The app creates or restores the participant's browser identity for this room and joins.
5. The participant sees the current story and round, and can vote if the round is VOTING.

### 9.3 Voting and reveal

1. Each participant selects one card from 0, 1/2, 1, 2, 3, 5, 8, 13, 20, or ?. Their browser seals the vote (11.4) and sends only the seal to the host. Everyone else sees only that they have voted.
2. Participants may change their vote until the host reveals.
3. The host selects Reveal. If no votes exist, Reveal is disabled. If any expected voter hasn't voted, the host sees a warning and must confirm (A-01).
4. The round moves to REVEALING. No new or changed votes are accepted, and each voter's browser opens its vote automatically.
5. When every sealed vote is opened, or the reveal deadline of 5 seconds [Default] passes, the round moves to REVEALED. Any vote not opened shows as "not revealed".
6. Everyone sees the cards, distribution, average, ? count, not voted and not revealed. Each browser checks every opened vote against its seal.

### 9.4 Start a new round

1. The host selects Start new round for the current story.
2. If the current round is still VOTING, the host is warned. On confirmation that round is cancelled [Default] (FR-041).
3. A new round opens with no votes carried over. Earlier rounds stay in History and are never overwritten.

### 9.5 Advance to another story

1. The host chooses a queued or estimated story, or adds a new one.
2. If a round is VOTING, the host is warned. On confirmation that round is cancelled [Default] (FR-041).
3. The chosen story becomes ACTIVE and the room shows the Discuss state. Selecting Start estimation opens its first (or next) round.
4. Earlier rounds stay in History, and the workspace clearly shows the active story.

### 9.6 End a room and expiry

1. The host selects End room and confirms.
2. The room becomes read-only. Any VOTING round is cancelled; no new votes or host actions are accepted. The deletion deadline doesn't change: it remains 24 hours after creation.
3. At the deadline, each device deletes the room: immediately if bravynix.com is open on it, otherwise the next time the site is opened there.

### 9.7 Host away and recovery

1. If the host closes the tab or loses the network, participants see "Waiting for the host". Voting pauses, history stays readable, and sealed votes are kept on each voter's device.
2. If the host reopens the room in the same browser, the room continues where it stopped.
3. On another device, the host opens the host link. The app restores host control and rebuilds the room from the participants' copies.
4. If the room is still open in another of the host's tabs or devices, the host sees "This room is open in another tab or device" and must close it there first.

## 10. Functional requirements

Priority legend: P0 = required to launch; P1 = valuable if feasible for V1; P2 = future enhancement. Every P0 requirement lists the acceptance criteria in section 18 that verify it.

| ID | Priority | Requirement | Acceptance criteria |
| --- | --- | --- | --- |
| FR-001 | P0 | The host shall be able to create a room on the landing page with an Epic name of 1 to 160 characters after trimming. | 18.1.1, 18.1.2 |
| FR-002 | P0 | Each room shall have an unguessable participant link of the form `bravynix.com/r/<roomId>`, where the room ID has 12 characters and is produced in the host's browser by a cryptographically secure method. | 18.1.3 |
| FR-003 | P0 | Only the holder of the room's host key shall be able to perform host actions. Participants' browsers shall verify the host before joining. | 18.1.8, 18.2.9 |
| FR-004 | P0 | Participants shall be able to join through a valid participant link without accounts or passwords. | 18.1.4 |
| FR-005 | P0 | Joining shall allow an optional display name of 1 to 32 characters [Default] (any language's characters, duplicates allowed) and an optional avatar from the built-in set. An omitted name displays as Anonymous and an omitted avatar as no avatar. | 18.1.5, 18.1.11 |
| FR-006 | P0 | The app shall restore a participant's identity after a refresh when the same browser profile still holds it. | 18.1.6, 18.1.9 |
| FR-007 | P0 | The host shall appear in the roster and may vote, using the same sealed path as everyone else. | 18.3.4 |
| FR-008 | P0 | The host shall be able to add story titles of 1 to 160 characters before and during the meeting, up to 500 per room. | 18.2.1, 18.2.2, 18.2.8 |
| FR-009 | P0 | The host shall be able to choose the active story and reorder queued and estimated stories. | 18.2.5 |
| FR-010 | P0 | The story title shall be the only story content field in V1. | 18.2.1 |
| FR-011 | P0 | Voting values shall be exactly 0, 1/2, 1, 2, 3, 5, 8, 13, 20, and ?. Any other value shall be refused. | 18.3.10 |
| FR-012 | P0 | Each participant shall have at most one current vote per round; changing it replaces the earlier one. | 18.3.1, 18.3.2 |
| FR-013 | P0 | Before reveal, no device other than the voter's, including the host's, shall receive a vote value or any average or distribution derived from votes. Only voted / not-voted status may be shared. | 18.3.3, 18.3.4 |
| FR-014 | P0 | Votes shall be revealed only when the host explicitly selects Reveal. The timer shall never reveal. | 18.3.5, 18.3.7, 18.5.2 |
| FR-015 | P0 | From the moment the host reveals, the round shall accept no new or changed votes. | 18.3.6, 18.5.4 |
| FR-016 | P0 | On reveal, the app shall calculate the arithmetic mean of numeric votes only; 0 and 1/2 are numeric. | 18.4.1, 18.4.2 |
| FR-017 | P0 | ? votes, non-voters and unrevealed votes shall be excluded from the average, with the ? count, not-voted count and not-revealed count shown separately. | 18.4.4, 18.4.9 |
| FR-018 | P0 | With no numeric votes, the app shall show "No numeric estimate" rather than zero or NaN. | 18.4.3 |
| FR-019 | P0 | The average shall be displayed to at most two decimals, rounded half-up, with trailing zeros removed, and never rounded to a card. | 18.4.8 |
| FR-020 | P0 | History shall keep each round's revealed votes, average, distribution, round number, story and participant display identities on each device until the room's data is deleted. | 18.4.7 |
| FR-021 | P0 | A re-vote shall create a new round and preserve all earlier rounds unchanged. | 18.4.5 |
| FR-022 | P0 | The host shall be able to end the room. An ended room is read-only: it accepts no votes or host actions, and any VOTING round is cancelled. It stays viewable live while the host's browser is open, and from each participant's own copy at any time until deletion. | 18.6.1, 18.6.2 |
| FR-023 | P0 | Every room's data shall be deleted from each device 24 hours after the room was created, whether or not it was ended: at the deadline if bravynix.com is open on that device, otherwise the next time it is opened there. | 18.6.3, 18.6.4, 18.6.5 |
| FR-024 | — | Retired in v1.1. Inactivity-based expiry is replaced by FR-023. | — |
| FR-025 | P0 | On every page load, the app shall delete all expired rooms from that device, with their keys, tokens and votes, before showing anything. | 18.6.4, 18.6.5 |
| FR-026 | P0 | A transient disconnect shall not lose acknowledged votes or history. The host's browser saves each change before acknowledging it. | 18.5.3, 18.5.5 |
| FR-027 | P0 | The app shall show whether each expected voter has voted in the open round. | 18.3.1 |
| FR-028 | P0 | The app shall offer an optional host-controlled countdown timer following 12.5. Expiry notifies the room and never reveals or closes voting. | 18.5.1, 18.5.2, 18.5.6 |
| FR-029 | P0 | The host's browser shall be the single authority for room state, ordering, timer and reveal. Every other device applies its signed changes in order. | 18.5.4 |
| FR-030 | P0 | The host may reveal before every expected voter has voted only after an explicit confirmation (A-01). | 18.3.8 |
| FR-031 | P0 | Participants who join after reveal shall see the results, shall not vote in the revealed round, and may vote in the next one. | 18.3.9 |
| FR-032 | P0 | A story with recorded rounds shall never be permanently deleted. The host may remove it from the queue with its history kept, and restore it later [Default]. | 18.2.3, 18.2.6 |
| FR-033 | P0 | The app shall offer a share action with copy confirmation. The participant link shall never contain the host key. | 18.1.7 |
| FR-034 | P0 | The app shall show ended, expired, unavailable and invalid-link states, using neutral wording that never reveals whether an unknown room existed. | 18.6.6 |
| FR-035 | P1 | The UI may animate the reveal and participant activity, with a reduced-motion alternative. | UX acceptance review |
| FR-036 | P1 | The timer may offer presets plus a custom duration, within the bounds in 12.5. | 18.5.6 |
| FR-037 | P0 | Stories shall follow the states in 12.2, with at most one ACTIVE story per room. | 18.2.5, 18.2.7 |
| FR-038 | P0 | The host shall be able to rename any story that isn't REMOVED. History shows the current title [Default]. | 18.2.4 |
| FR-039 | P0 | The host shall be able to permanently delete a story that has no rounds. | 18.2.6 |
| FR-040 | P0 | Activating a story shall show the Discuss state: the card deck is disabled, and no round exists until the host selects Start estimation. | 18.2.7 |
| FR-041 | P0 | If the host activates another story, starts a new round or ends the room while a round is VOTING, the app shall warn, and on confirmation the round becomes CANCELLED [Default]. A cancelled round's votes are discarded and never revealed. History shows it as "Round n: cancelled, not revealed", and it keeps its number. | 18.3.11, 18.6.1 |
| FR-042 | P0 | Votes shall be sealed as described in 11.4. The voter's browser sends only a seal before reveal and opens the vote automatically at reveal. | 18.3.3, 18.3.12 |
| FR-043 | P0 | A vote not opened within the reveal deadline of 5 seconds [Default] after reveal shall be shown as "not revealed". | 18.4.9 |
| FR-044 | P0 | Each participant's app shall verify revealed votes against their seals. A voter's app shall warn if the published vote differs from the one they cast. | 18.3.13 |
| FR-045 | P0 | The unique host link shall be shown once at creation, with a Copy action and a warning. It carries the host key after `#`. Opening it removes the key from the address bar, and opening it on another device restores host control. | 18.1.1, 18.1.10 |
| FR-046 | P0 | Only one device or tab may host a room at a time. Any other shows "This room is open in another tab or device". | 18.1.10 |
| FR-047 | P0 | While the host is offline, participants shall see "Waiting for the host": voting paused, history readable, reconnection automatic. | 18.5.7 |
| FR-048 | P0 | At most 50 people, host included, may be online in a room; further join attempts see "This room is full". At 500 stories, Add story is disabled with an explanation. | 18.1.12, 18.2.8 |
| FR-049 | P0 | Participants shall be able to change their own name and avatar while the room is active. The change applies to the roster and to rounds not yet revealed. | 18.1.11, 18.4.6 |
| FR-050 | P0 | The landing page shall meet 8.1, including "My rooms" for this device. | 18.6.7 |
| FR-051 | P1 | "Delete this room from this device" shall be available in "My rooms" and in the room menu. | 18.6.8 |
| FR-052 | P0 | A client running an incompatible app version shall be told "A newer version of Bravynix is available. Please refresh." | 18.5.8 |
| FR-053 | P1 | A connection diagnostics panel shall show connection state, direct or relayed path, connection-service reachability, app version and last error. "Copy diagnostics" must exclude room content and keys. | UX acceptance review |
| FR-054 | P1 | Host aids: advise a laptop for rooms of more than about 15 people, warn the host when the room tab is hidden, and keep the screen awake while hosting where the browser supports it. | UX acceptance review |
| FR-055 | P1 | "Remember me" may store the last-used name and avatar on this device. It is off by default [Default]. | UX acceptance review |
| FR-056 | P0 | Refused actions shall show the messages in 8.7. | 18.3.6, 18.3.10 |
| FR-057 | P0 | While a participant is disconnected, the card deck shall be disabled with "Reconnecting: your vote isn't recorded yet". | 18.5.3 |

## 11. Calculation and voting rules

### 11.1 Card values

| Card label | Numeric value? | Included in average? |
| --- | --- | --- |
| 0 | Yes (0) | Yes |
| 1/2 | Yes (0.5) | Yes |
| 1 | Yes (1) | Yes |
| 2 | Yes (2) | Yes |
| 3 | Yes (3) | Yes |
| 5 | Yes (5) | Yes |
| 8 | Yes (8) | Yes |
| 13 | Yes (13) | Yes |
| 20 | Yes (20) | Yes |
| ? | No numeric value | No; counted separately |

### 11.2 Average formula

Average = sum of numeric vote values / count of numeric votes.

- A ? vote is a submitted vote but is excluded from both the numeric sum and the count.
- Non-voters and unrevealed votes are not votes for the calculation and are excluded.

Example: numeric votes 2, 3, 5, 5 and 8 plus one ? give an average of 4.6 from five numeric votes, with one ? shown separately. If every revealed vote is ?, show "No numeric estimate" and the ? count.

### 11.3 Rounding and representation

- Every card value is a multiple of 1/2, so the sum is kept as a whole number of half-points. This avoids floating-point error.
- Display the average to at most two decimals, rounding half-up and trimming trailing zeros. This is a display rule only; never map the result to a card.
- The calculated average is the round's displayed score. There is no host override; a team wanting another estimate starts a new round.
- Show the numeric-vote count, ? count, not-voted count and not-revealed count alongside the average.

### 11.4 Sealed votes

When a participant picks a card, their browser creates a seal from the card, the round, the participant and a random 16-byte secret. Only the seal is sent to the host. The card and secret stay on the voter's device until reveal.

At reveal, each voter's browser automatically sends its card and secret. Every device checks them against the seal. As a result:

- No device other than the voter's ever holds a vote value before reveal, not even the host's.
- Everyone can verify every revealed result.
- A voter who is offline from reveal until the deadline shows as "not revealed".
- An opening that doesn't match its seal is shown as invalid, counted as not revealed, and excluded.

### 11.5 Counting voters

- **Not voted** = expected voters (12.4) with no seal when the host reveals.
- **Not revealed** = sealed votes with no valid opening by the reveal deadline.
- People who joined after the round was revealed are not counted in either.

## 12. Room lifecycle and real-time state

### 12.1 Room states

| State | Meaning | Allowed operations |
| --- | --- | --- |
| ACTIVE | The room is open for stories, participants and rounds. | Host actions, joining, voting, reveal, timer, story navigation. |
| ENDED | The host ended the room before its deadline. | Read-only viewing. No votes, joins to vote, or host actions. |
| EXPIRED | 24 hours have passed since creation. | Nothing. Each device deletes its copy at the deadline, or when the site is next opened there. |

### 12.2 Story states

| State | Meaning |
| --- | --- |
| QUEUED | Added and waiting, or left before any round was revealed. |
| ACTIVE | The story being discussed or estimated. At most one per room. |
| ESTIMATED | Has at least one revealed round and is no longer active. |
| REMOVED | Hidden from the queue; its history is kept. It can be restored to the queue [Default]. |

Rules:

- Activating a story shows the Discuss state.
- When the host leaves the active story, it becomes ESTIMATED if it has a revealed round, otherwise QUEUED.
- Any story that isn't REMOVED can be renamed.
- A story with no rounds can be permanently deleted. A story with rounds can only be removed.
- The active story can't be removed while its round is VOTING.

### 12.3 Round states

| State | Behaviour |
| --- | --- |
| (Discuss) | Not a round: the story is active and no round has started. The card deck is disabled. |
| VOTING | Participants can submit or change one sealed vote. Only vote status is visible to others. |
| REVEALING | The host has revealed. No new or changed votes are accepted while votes are opened, for at most the reveal deadline. |
| REVEALED | Locked. Revealed votes and results are visible; voting again needs a new round. |
| CANCELLED | Ended without reveal because the host switched story, restarted or ended the room. Its votes are discarded and never shown. |

### 12.4 Roster, presence and expected voters

- **Roster:** everyone who has joined the room. Entries stay until the room is deleted and are shown as online or offline. One entry per browser identity, however many tabs it uses.
- **Online:** has a live connection to the host's browser.
- **Expected voters for a round:** roster members who were online when the round opened, plus anyone who joined while it was VOTING. The host is an expected voter only if they vote in that round [Default].
- The not-voted count and the early-reveal warning (A-01) use expected voters only.
- **Capacity:** at most 50 people online, host included.

### 12.5 Timer rules

- The timer is off by default. The host picks a preset of 1, 2, 3 or 5 minutes, or a custom duration from 30 seconds to 30 minutes [Default].
- Controls: Start, Stop and Restart. No pause in V1 [Default].
- Reveal stops the timer. Starting a new round, changing story or ending the room clears it.
- At zero, show a visual notice and a screen-reader announcement. No sound in V1 [Default]. The timer never reveals or closes voting.
- Late joiners and reconnecting participants see the remaining time as reported by the host's browser, not their own clock.

### 12.6 Real-time rules

- The host's browser (the room referee) is the single source of truth for stories, rounds, votes, reveal, timer and room state.
- Each change is ordered, saved on the host's device before it is acknowledged, and signed with the host key. Other devices verify each change and apply them in order; a gap triggers a request for a fresh signed copy.
- Participants connect only to the host, never to each other.
- Before reveal, only seals and vote status travel between devices.
- The host's browser refuses late or duplicate actions after reveal, end or expiry, even if a client still shows an enabled control.
- Every message carries a message ID, so retries never create duplicate votes or rounds.
- Reconnecting devices re-sync from the host rather than trusting their own local state.

## 13. Data model

This is a logical model, not a storage schema. All of it lives in browser storage on the devices in the room. The host's device holds the authoritative record, and every participant's device holds a host-signed copy.

| Entity | Key fields | Held by |
| --- | --- | --- |
| Room | Room ID; Epic title; status; created at; expires at (created + 24 h); host public key; state version | Host (authoritative); each participant (copy) |
| Story | Story ID; title; position; status | Everyone |
| Round | Round ID; story; round number; status; started at; revealed at | Everyone |
| Sealed vote | Round; participant; seal; after reveal: card, secret, display name and avatar snapshot | Seal: host. Card and secret: voter only until reveal. Everything: everyone after reveal |
| Result | Sum in half-points; numeric count; ? count; not voted; not revealed; display average | Everyone |
| Participant | Participant ID; token fingerprint; display name; avatar ID; joined at; online | Roster: everyone. Token fingerprint: host only. Token: the participant's own device |
| Timer | Duration; end time; running or stopped | Everyone |

### 13.1 Relationships

- One room has one Epic title and many stories and participants.
- One story has ordered rounds; a re-vote never overwrites an earlier round.
- One round has at most one sealed vote per participant. No seal means the participant hasn't voted in that round.
- A revealed vote carries a display-identity snapshot so History stays stable if the participant later changes their name or avatar.

### 13.2 Data validation

- Epic and story titles: 1 to 160 characters after trimming whitespace.
- Display name: 1 to 32 characters after trimming [Default]. Counted as user-perceived characters; any language's characters allowed.
- Card values must come from the fixed set in 11.1; avatar IDs must come from the built-in list.
- The host's browser checks that every story, round and participant ID belongs to its own room.
- Times are stored in UTC and displayed in the viewer's local time.

### 13.3 Where data does not live

- No Bravynix server stores room data. There are no server backups or exports.
- Hostinger serves the website files and keeps normal access logs (IP address and page path).
- PeerJS cloud and STUN servers see connection set-up data and IP addresses, never room content.

## 14. Security, privacy, and abuse prevention

### 14.1 Access model

- No account credentials are collected. Joining needs only the participant link; participants are not verified identities.
- Room IDs are about 71 bits of unguessable randomness, derived from the host's public key. No list of rooms exists anywhere.
- The host's browser creates a host key pair. Participants' browsers confirm that the host holds the key matching the room ID before joining, and verify the host's signature on every change.
- The host link carries the host key after `#`, which browsers never send in requests. The app removes it from the address bar after reading it. The participant link never contains it.
- Each participant has a random token per room, saved in their browser. The host keeps only the token's fingerprint.
- Host actions can only originate in the host's browser. The host's browser refuses any host action arriving from a participant; hiding buttons is not the control.

### 14.2 Vote privacy

- Before reveal, devices exchange only seals and whether each participant has voted (11.4).
- The host's own vote is sealed like everyone else's. Host privilege allows reveal and management, not seeing votes early.
- No average or distribution exists anywhere before reveal.
- After reveal, every device can verify every result, and a voter's app warns if its vote was misreported.

### 14.3 Web application security

- Serve everything over HTTPS with HSTS.
- Apply a strict content security policy: only the site's own scripts, connections only to the site and PeerJS cloud, and no third-party scripts.
- Validate and length-limit every input. Render names and titles as text, never as HTML.
- The host's browser limits each participant's message rate (10 per second [Default]) and message size, and enforces the room cap.
- Send `Referrer-Policy: no-referrer` and the other security headers listed in SDD 13.4.
- Use two-factor sign-in on the Hostinger and GitHub accounts. Lock dependency versions, and deploy only builds produced by the CI pipeline.
- Never put vote values, secrets or the host key in URL paths, query strings or console logs.

### 14.4 Privacy

- **Collected:** Epic and story titles, optional display names, avatar choices, votes and timestamps. Stored only on the devices in the room.
- **No tracking:** no product analytics, advertising or third-party tracking.
- **IP addresses:**
    - Because connections are peer-to-peer, the host's browser can see each participant's IP address, and participants can see the host's.
    - PeerJS cloud, STUN servers and Hostinger also process IP addresses.
- **Wording:** don't describe the service as anonymous in an absolute sense.
- **The privacy notice must include this agreed wording:** "Bravynix stores no room data on its servers. Each room exists only in participants' browsers and is deleted 24 hours after it was created: immediately if the site is open, otherwise the next time the site is opened on that device."
- **The privacy notice must also explain:**
    - the IP-address visibility above;
    - Hostinger's access logs;
    - that a device which never reopens the site keeps its expired copy until it does;
    - that copies of a browser profile made by device backup tools are outside Bravynix's control.
- **Legal review:** have the notice reviewed against applicable law (for example India's Digital Personal Data Protection Act, 2023) before public launch. This PRD makes no compliance claim.

## 15. Retention and deletion

| Trigger | Required behaviour | When |
| --- | --- | --- |
| Room created | Expiry is fixed at creation time + 24 hours. | At creation |
| Host ends the room | Read-only; any VOTING round cancelled; expiry unchanged. | Immediately |
| Deadline reached while the site is open on a device | Delete that device's room record or copy, host key, participant token, sealed votes and cached data. Close connections and show "This room isn't available". | At the deadline |
| Site opened on a device after a deadline | Delete every expired room before anything is shown. | On every page load |
| A participant deletes a room from their device | Delete that device's copy immediately. | On request |
| The host deletes a room from the host device | After confirmation, end the room for everyone, then delete the host's copy. | On request |

### 15.1 Deletion completeness

- Delete every store that holds the room: room record or copy, keys, tokens, sealed votes, the "My rooms" entry and timer state.
- No server copy or backup exists. A device's OS-level backups of the browser profile are outside Bravynix's control and are disclosed in the privacy notice.
- Deletion is idempotent: running it again on an already-deleted room does nothing and doesn't fail.

## 16. Edge cases and required behaviour

| Scenario | Expected behaviour |
| --- | --- |
| No stories yet | Host sees an add-story prompt; participants see "Waiting for the host to add a story". |
| No one has voted | Reveal is disabled until at least one vote exists. |
| Host reveals before all expected voters have voted | Warning, then confirmation; only submitted votes are revealed. |
| Participant selects ? | Counted as submitted; shown after reveal; excluded from the average. |
| All revealed votes are ? | "No numeric estimate" and the ? count; never an average of zero. |
| Some expected voters don't vote | Shown as not voted; excluded from the average. |
| Participant changes vote before reveal | Replaces their seal; never a second vote. |
| Participant votes after reveal starts | Refused with "Voting for this round has closed". |
| Reveal and vote happen at the same moment | The host's browser decides the order. After reveal, no later vote is accepted. |
| Voter offline at reveal | If they return before the deadline their vote opens; otherwise "not revealed". |
| Opening doesn't match its seal | Shown as invalid, counted as not revealed, excluded. |
| Participant joins during VOTING | Added to the roster; may vote before reveal. |
| Participant joins after reveal | Sees results and history; votes from the next round. |
| Participant opens the link while the host is offline | "Waiting for the host to open the room"; automatic retry. |
| Browser refresh or short network loss | Reconnect with the saved identity; re-sync from the host; card deck disabled while disconnected. |
| Browser storage cleared or new device | Treated as a new participant; identities are never merged. |
| Host closes the tab mid-round | Voting pauses; sealed votes kept on voters' devices; the round resumes when the host returns. |
| Host loses both the host link and browser storage | Host control is lost. Participants keep read-only copies until deletion. No host transfer in V1. |
| Host opens the room in a second tab or device | "This room is open in another tab or device." |
| Someone else occupies the room while the host is away | Participants see "Couldn't verify the host" and don't join. The host can create a new room. |
| Network blocks connections | "Can't connect to the host from this network", with diagnostics and the suggestion to try another network. |
| PeerJS cloud unreachable | "Can't reach the connection service"; existing connections continue. |
| Room full | "This room is full (50 people)." |
| Host switches story or restarts during VOTING | Warning; on confirmation the round is CANCELLED [Default]. |
| Host ends the room during VOTING | End takes precedence; the round is cancelled; the room becomes read-only. |
| Timer reaches zero | Notice shown; voting continues until the host reveals. |
| Room reaches 24 hours | Each device deletes it at the deadline, or on next opening the site. |
| Device clock is wrong | Deletion happens early or late on that device; the timer uses the host's remaining time. |
| App updated during a meeting | Outdated clients see "Please refresh". |
| Duplicate message after a retry | Ignored by message ID; no duplicate votes or rounds. |
| Card value not in the deck (tampered client) | Refused; the round stays open. |
| Story with history removed | Hidden from the queue; history kept; can be restored [Default]. |
| Link is invalid, expired or unknown | Neutral "This room isn't available" without revealing whether it existed. |

## 17. Non-functional requirements

| Category | Requirement |
| --- | --- |
| Performance | p95 of 500 ms or less for a vote-status or result update to reach online participants in a 50-person room (proposed; measured in the pilot). Creating a room completes in the browser in under 2 seconds. A join target of 2 seconds p95 is likely tight for peer-to-peer set-up, so measure it in the pilot and set the launch target with the owner. |
| Capacity | 50 people online per room, host included; 500 stories per room. A host on a laptop or desktop is recommended above about 15 people. Validate with a 50-person load test. |
| System scale | No Bravynix server carries load. Beta assumption: tens of rooms a day. Check PeerJS cloud's terms and capacity before launch. |
| Reliability | The host's browser saves each change before acknowledging it. Transient disconnects never erase acknowledged changes. |
| Consistency | Host-authoritative. A reveal has one final order, and all online devices converge on the same signed result. |
| Availability | Best effort, with no guarantee. Starting and joining rooms depends on PeerJS cloud and Hostinger; open rooms keep working if either is briefly unavailable. A daily smoke test checks production. |
| Security | Section 14, plus automated tests for pre-reveal privacy, forged host messages, impostor hosts and tampered openings. |
| Privacy | No room data on any server; no analytics; automatic deletion after 24 hours is a first-class requirement. |
| Accessibility | WCAG 2.2 Level AA on all surfaces, including live announcements (8.6). |
| Compatibility | Current and previous major versions of Chrome, Edge, Firefox and Safari, including mobile Chrome and iOS Safari. Requires WebRTC data channels, Web Crypto and IndexedDB. Verify iOS Safari in the pilot. |
| Localization | English interface. Names and titles accept any language's characters. Averages use a decimal point. Times are shown in the viewer's local time. |
| Maintainability | Voting, calculation, privacy, ordering and lifecycle logic live in pure, unit-tested modules, independent of the UI and the connection library. |
| Observability | No telemetry. An in-app diagnostics panel, the daily smoke test and Hostinger access logs only. Logs never contain vote values, secrets or keys. |

## 18. Acceptance criteria and test scenarios

Each criterion names the requirements it verifies. Test security-sensitive criteria by inspecting every device and by using tampered clients, not only through the UI.

### 18.1 Room, identity and host

1. Given a visitor with no account, when they create a room with a valid Epic name, then the room is created in their browser, the participant link and host link are shown, and the host lands in the workspace. (FR-001, FR-045)
2. Given an Epic name that is empty, only whitespace or 161 characters long, when the visitor creates a room, then creation is refused with an accessible validation message. (FR-001)
3. Given two rooms created one after the other, when their links are compared, then each has a different 12-character room ID in the form `bravynix.com/r/<roomId>`. (FR-002)
4. Given a valid participant link with the host online, when a visitor opens it, then they can join without any username or password. (FR-004)
5. Given a participant enters no name and picks no avatar, when they join, then the roster shows Anonymous with no avatar. (FR-005)
6. Given a participant refreshes in the same browser profile with storage intact, when they reconnect, then they are the same participant and no duplicate roster entry appears. (FR-006)
7. Given the participant link, when it is inspected and used, then it contains no host key, grants no host controls, and the share action shows a copy confirmation. (FR-033)
8. Given a device without the host key, when it sends a host action or occupies the room's connection slot, then host actions are refused, and participants show "Couldn't verify the host" and don't join. (FR-003)
9. Given browser storage was cleared or a different browser is used, when the person rejoins, then they get a new identity and the app doesn't claim they are the same person. (FR-006)
10. Given the host opens the host link on another device while the original tab is closed, when the room loads, then host control is restored and the key is removed from the address bar. If the original tab is still open, the new device shows "This room is open in another tab or device". (FR-045, FR-046)
11. Given the join form and an active room, when a participant enters a name, then names over 32 characters are refused, any language's characters display correctly, duplicate names are allowed, and the avatar picker shows the built-in set. A tampered avatar ID displays as no avatar. Changing name or avatar later updates the roster. (FR-005, FR-049)
12. Given 50 people online in a room, when a 51st person tries to join, then they see "This room is full (50 people)" and no roster entry is created. (FR-048)

### 18.2 Story management

1. Given an active room, when the host adds a valid story title, then the story appears in the queue for every online participant, with the title as its only field. (FR-008, FR-010)
2. Given participants have already joined, when the host adds a story, then it becomes available without creating a new room. (FR-008)
3. Given a story with recorded rounds, when the host removes it, then it disappears from the queue, its history stays available, and restoring it returns it to the queue. (FR-032)
4. Given a story, when the host renames it, then everyone sees the new title, including in History. (FR-038)
5. Given several stories, when the host activates one and reorders others, then everyone sees the same order and exactly one ACTIVE story. (FR-009, FR-037)
6. Given a story with no rounds, when the host deletes it, then it is gone permanently. For a story with rounds, permanent delete isn't offered. (FR-039, FR-032)
7. Given the host activates a story, when the room updates, then everyone sees the Discuss state with the deck disabled until Start estimation. Leaving a story with a revealed round makes it ESTIMATED; leaving one without makes it QUEUED. (FR-040, FR-037)
8. Given a room with 500 stories, when the host tries to add another, then Add story is disabled with an explanation. A 161-character title is refused. (FR-008, FR-048)
9. Given a participant, when they attempt to create, rename, reorder, remove or delete a story, including with a tampered client, then the host's browser refuses it. (FR-003)

### 18.3 Voting and privacy

1. Given an open round, when a participant selects an allowed card, then others see only that they have voted. (FR-012, FR-027)
2. Given a participant has voted, when they select a different card before reveal, then the round still holds exactly one vote for them. (FR-012)
3. Given an open round, when the memory, storage and received messages of every device other than the voter's (including the host's) are inspected before reveal, then no vote value, average or distribution is found; only seals and vote status. (FR-013, FR-042)
4. Given the host votes, when the round is open, then the host's vote is sealed like everyone else's and the host can't see other votes. (FR-007, FR-013)
5. Given an open round with at least one vote, when the host reveals, then the round passes through REVEALING to REVEALED and every online device shows the same results. (FR-014)
6. Given reveal has started, when any participant submits or changes a vote, then it is refused with "Voting for this round has closed" and history is unchanged. (FR-015, FR-056)
7. Given no votes exist, when the host looks at the reveal control, then Reveal is disabled. (FR-014)
8. Given an expected voter hasn't voted, when the host selects Reveal, then a warning appears and the reveal needs confirmation. (FR-030)
9. Given a round has been revealed, when someone joins, then they see the results, can't vote in that round, and can vote in the next. (FR-031)
10. Given a tampered client, when it submits a card value outside the deck, then it is refused with "That card isn't available" and the round stays open. (FR-011, FR-056)
11. Given a round is VOTING, when the host switches story, starts a new round or ends the room, then a warning appears. On confirmation the round becomes CANCELLED, no votes are revealed, and History shows "Round n: cancelled, not revealed". (FR-041)
12. Given a participant votes, when their outgoing messages are inspected, then only a seal is sent before reveal, and the opening is sent automatically at reveal. (FR-042)
13. Given a tampered host publishes a vote different from the one cast, when the voter's app receives the result, then it shows a warning. An opening that doesn't match its seal is shown as invalid and excluded. (FR-044)

### 18.4 Calculation and history

1. Given numeric votes 2, 3, 5, 5 and 8 plus one ?, when revealed, then the average is 4.6, the numeric-vote count is 5 and the ? count is 1. (FR-016)
2. Given votes 0, 1/2 and 1, when revealed, then all three are numeric and the average is 0.5. (FR-016)
3. Given every revealed vote is ?, when revealed, then the result says "No numeric estimate" and shows the ? count, never zero. (FR-018)
4. Given some expected voters didn't vote, when revealed, then they are excluded from the average and not counted as ?. (FR-017)
5. Given a story with one revealed round, when the host starts a re-vote, then a new round number is created with no inherited votes, and the earlier round stays in History. (FR-021)
6. Given a participant changes their name after a round was revealed, when that round is opened in History, then it shows the snapshot name from the reveal. (FR-049)
7. Given any revealed round, when anyone opens History before deletion, then they see the story title, round number, timestamps, revealed votes, average or "No numeric estimate", ? count, not voted, not revealed and participant labels. (FR-020)
8. Given votes 1, 2 and 3, the average displays "2". Given 1/2, 1 and 1, it displays "0.83". Given eight votes of 1/2, 1/2, 0, 0, 0, 0, 0, 0, it displays "0.13". An average of 4.6 displays as "4.6", not "4.60". (FR-019)
9. Given a voter is offline from reveal until the 5-second deadline, when results are published, then their vote shows as "not revealed", is excluded from the average, and is counted separately. (FR-017, FR-043)

### 18.5 Timer and real-time behaviour

1. Given an active room, when the host starts the timer, then everyone sees the same remaining time, including people who join later. (FR-028)
2. Given the timer reaches zero, when the notice appears, then no votes are revealed and voting continues until the host reveals. (FR-014, FR-028)
3. Given a participant loses network briefly, when they are disconnected, then the card deck is disabled with the reconnecting message. On reconnect the state re-syncs from the host with no duplicate vote or round. (FR-026, FR-057)
4. Given a vote and a reveal race, when the host's browser processes the reveal first, then the vote is refused. When it processes the vote first, the vote is included. (FR-015, FR-029)
5. Given the host refreshes the page, when the room reloads, then it continues from the host's saved state, participants reconnect automatically, and no acknowledged vote is lost. (FR-026)
6. Given a running timer, when the host reveals, then the timer stops. When the host starts a new round or changes story, it clears. A custom duration outside 30 seconds to 30 minutes is refused. (FR-028, FR-036)
7. Given the host closes the room tab, when participants look at the room, then they see "Waiting for the host" and can read history. When the host returns, voting resumes with sealed votes intact. (FR-047)
8. Given a client on an incompatible app version, when it connects, then it sees "A newer version of Bravynix is available. Please refresh." (FR-052)

### 18.6 Ending and deletion

1. Given an active room, when the host ends it, then the room becomes read-only, voting and host actions are disabled, any VOTING round is cancelled, and the deletion deadline stays at creation + 24 hours. (FR-022, FR-041)
2. Given an ended room before its deadline, when participants look at it, then they can view it read-only (live while the host's browser is open, and from their own copy at any time) but can't vote. (FR-022)
3. Given bravynix.com is open on a device when a room reaches creation + 24 hours, when the deadline passes, then that device deletes the room's data, keys, tokens and votes, closes its connections and shows "This room isn't available". (FR-023)
4. Given a device that wasn't open at the deadline, when bravynix.com is next opened on it, then every expired room is deleted before anything is shown. (FR-023, FR-025)
5. Given a host created five rooms at different times, when each reaches its own deadline, then only that room disappears and the others are unaffected. (FR-023, FR-025)
6. Given an invalid, expired or unknown room link, when it is opened, then the app shows a neutral "This room isn't available" without revealing whether the room existed. (FR-034)
7. Given rooms created or joined on this device, when the landing page loads, then "My rooms" lists them with role and time left, and expired rooms never appear. (FR-050)
8. Given a room in "My rooms", when the user selects "Delete from this device", then that device's copy is removed immediately. (FR-051)

## 19. Testing and release readiness

### 19.1 Required test layers

- **Unit:** calculation and display rounding, card validation, story and round state machines, seals and openings, signatures, expiry calculation.
- **Integration:** multiple browsers against a local connection server, covering create, join, vote, reveal, reconnect, host recovery and expiry.
- **End-to-end:**
    - the host creates a room and several participants join, vote privately, reveal and view results;
    - a re-vote, a story added mid-session, a story switch during voting, and ending the room.
- **Security:**
    - pre-reveal vote extraction from every device, including the host's;
    - forged host messages, an impostor host and tampered openings;
    - script injection through names and titles;
    - link guessing and message flooding.
- **Load:** a host on a laptop with 49 participants, including with the host tab in the background; measure update latency.
- **Network pilot:** office Wi-Fi, a VPN, and Jio and Airtel mobile data. Record direct versus relayed connections and latency.
- **Accessibility and device:**
    - keyboard-only voting, screen-reader labels and announcements, reduced motion;
    - narrow phone viewports, iOS Safari and Android Chrome, refresh on mobile, long titles.

### 19.2 Release gates

- All P0 requirements pass their acceptance criteria.
- No vote value is found on any device other than the voter's before reveal.
- The 50-person load test meets the performance target, or the room cap is lowered.
- The network pilot is complete, and every pilot participant connects directly or through a relay. Otherwise the Cloudflare relay is adopted first.
- PeerJS cloud's terms have been reviewed and allow this use.
- The strict content security policy and security headers are in place, and two-factor sign-in is on for Hostinger and GitHub.
- The privacy notice is published and legally reviewed.
- A small real team has completed a pilot grooming session, and critical usability issues are resolved.
- The daily production smoke test is scheduled.

## 20. Risks and future roadmap

| Item | Risk | Mitigation or next step |
| --- | --- | --- |
| Blocked networks | Office, VPN or mobile networks stop some people joining. | Network pilot; diagnostics panel; Cloudflare relay ready. |
| PeerJS cloud dependency | Its terms, capacity or uptime may not suit a public site. | Check terms before launch; daily smoke test; self-hosted signaling or server-side rooms as fallbacks. |
| Host device capacity | A host device may not hold 49 connections reliably. | Load test; laptop advice; keep screen awake; lower the cap if needed. |
| Host away | Rooms stall while the host is offline. | "Waiting for the host" state; hidden-tab warning; host link recovery. Accepted. |
| Unrevealed votes | A voter who leaves before reveal can't be opened. | Seal kept on their device; reveal deadline; honest "not revealed". Accepted. |
| Malicious script | Injection, or a compromised account or dependency, could expose keys and votes. | Strict content security policy, escaping, two-factor sign-in, locked dependencies, CI-only deploys. |
| Room blocking | Someone with the link could occupy the room while the host is away. | Host verification stops impersonation; the host can start a new room. |
| Lingering copies | Devices that never return keep expired copies. | Purge on load; privacy-notice wording; "Delete from this device". |
| IP visibility | Peer-to-peer exposes IP addresses between host and participants. | Disclose in the privacy notice. |
| AI-generated code | Subtle bugs in ordering, sealing or signatures. | Pure, unit-tested modules; security tests; human review of those modules. |
| Link sharing | Anyone with the participant link can join an active room. | Unguessable IDs; capacity cap; End room. |
| Anonymous duplicates | A person with cleared storage or a second device appears twice. | Accepted no-login limit; deduplicate per browser identity only. |
| Average interpretation | A decimal average may not match a card or reflect consensus. | Show the distribution and each vote; never round or label the mean as agreed points. |
| Version mixing | An update during a meeting mixes app versions. | Version check, evening releases, compatible minor versions. |

### 20.1 Future roadmap (not V1 commitments)

- Jira import and write-back of estimates. This needs server-held credentials, so it ends the no-backend model.
- Optional export before deletion.
- Co-hosts, host transfer, observer role, participant removal and link rotation.
- Team templates, alternate card decks and custom scales.
- Server-side rooms if peer-to-peer limits are reached (SDD ADR-09).
- Privacy-preserving aggregate error counts.

## 21. UX handoff summary

Use the reference screenshots for the estimation canvas:

- a focused current-story heading;
- a row of participant avatars with status;
- a horizontal card deck anchored near the bottom;
- a clear Discuss / Estimate / Review progression;
- a results and history sidebar.

Make the current task and voting state the visual priority, and keep administration controls out of the main canvas.

| Surface | Contents | Primary action |
| --- | --- | --- |
| Landing page | Product promise, how it works, Epic name field, "My rooms" on this device, privacy link | Create room |
| Room created | Participant link, host link shown once with warning, hosting advice | Copy participant link |
| Join screen | Epic name, optional name, optional avatar (about 20 built-in), anonymous default | Join room |
| Main workspace | Epic header, story title and position, participant status, card deck, host controls, connection status | Select card / Reveal |
| Results sidebar | Average, numeric count, ? count, not voted, not revealed, distribution, individual cards | Start new round |
| History | Stories, rounds, timestamps, average or no-average, votes and identity snapshots, cancelled rounds | Open round details |
| Waiting for the host | Paused-voting message; history still readable | None (automatic reconnect) |
| Ended or unavailable | Read-only or neutral unavailable message | No room actions |
| Diagnostics panel (P1) | Connection state, path, service reachability, version, last error | Copy diagnostics |

## 22. Open decisions and defaults applied

These defaults were applied so the PRD is buildable. The product owner should confirm or change each one.

| ID | Decision | Default applied | Where |
| --- | --- | --- | --- |
| D-01 | When the host switches story or restarts during VOTING: cancel the round or block the action? | Warn, then cancel | FR-041, 9.4, 9.5 |
| D-02 | Reveal deadline | 5 seconds | FR-043, 9.3 |
| D-03 | Remember a user's name and avatar on their device | Off by default; opt-in | FR-055 |
| D-04 | Room link form: `/r/<roomId>` (appears in Hostinger logs) or `/r#<roomId>` (never reaches a server) | `/r/<roomId>` | FR-002 |
| D-05 | Is the host an expected voter? | Only if they vote in that round | 12.4 |
| D-06 | Display-name length | 32 characters | FR-005, 13.2 |
| D-07 | Timer presets, bounds and controls | 1, 2, 3 or 5 minutes; custom 30 seconds to 30 minutes; Start, Stop, Restart; no pause; no sound | 12.5 |
| D-08 | Does History show a renamed story's current or original title? | Current title | FR-038 |
| D-09 | Can removed stories be restored? | Yes | FR-032, 12.2 |
| D-10 | Does a cancelled round keep its number? | Yes | FR-041 |
| D-11 | Display rounding mode | Half-up | FR-019, 11.3 |
| D-12 | Per-participant message rate limit | 10 per second | 14.3 |
| D-13 | Launch threshold for the network pilot | Every pilot participant connects, directly or through a relay | 4, 19.2 |
| D-14 | Named product owner and confirmation of the Proposed assumptions in 6.2 | Pending | 1, 6.2 |
| D-15 | Legal review of the privacy notice before public launch | Recommended | 14.4 |

## Appendix A. Short glossary

| Term | Definition |
| --- | --- |
| Epic | The room-level label entered by the host. A room holds one Epic. |
| Story | A titled work item being estimated. V1 stores only its title. |
| Round | One voting attempt for one story. A re-vote creates a new round. |
| Discuss | The state where a story is active but no round has started; the card deck is disabled. |
| Reveal | The host-triggered move from private voting to visible results, through REVEALING to REVEALED. |
| Room referee | The part of the app running in the host's browser that holds the authoritative room state and orders every change. |
| Seal | A fingerprint of a vote plus a random secret, sent before reveal so nobody else can see the vote. |
| Opening | The card and secret a voter's browser sends at reveal so everyone can check them against the seal. |
| Not revealed | A sealed vote whose owner didn't open it before the reveal deadline. |
| Expected voter | A roster member counted for "not voted" and the early-reveal warning (12.4). |
| Numeric vote | Any of 0, 1/2, 1, 2, 3, 5, 8, 13, or 20. |
| ? vote | A submitted special-card vote, shown and counted separately and excluded from the average. |
| Host link | The private link carrying the host key, used to host from another device. |
| Temporary browser identity | An unverified, room-scoped identity stored by the browser for refresh and reconnection. |
