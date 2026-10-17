import type { Profile } from "@/domain/room/profile";
import type { StoryId } from "@/domain/room/room";
import type { CardId } from "@/domain/rules/deck";

/**
 * Everything a device can ask of the room. Each command comes from one participant (the
 * actor); host commands are refused from anyone else (PRD FR-003). Participants' commands
 * reach the host's referee as protocol messages (SDD 12); host commands never travel.
 */
export type RoomCommand =
  | { type: "join"; profile: Profile; asHost: boolean }
  | { type: "set-online"; online: boolean }
  | { type: "update-profile"; profile: Profile }
  | { type: "add-story"; title: string }
  | { type: "rename-story"; storyId: StoryId; title: string }
  | { type: "move-story"; storyId: StoryId; toIndex: number }
  | { type: "remove-story"; storyId: StoryId }
  | { type: "restore-story"; storyId: StoryId }
  | { type: "delete-story"; storyId: StoryId }
  | { type: "activate-story"; storyId: StoryId }
  | { type: "start-round" }
  /**
   * A sealed vote: only its fingerprint reaches the referee, never the card (PRD 11.4, SDD 11.4).
   * Casting again replaces the seal.
   */
  | { type: "cast-vote"; seal: string }
  | { type: "reveal" }
  /**
   * The vote opened at reveal. `fingerprint` is the seal recomputed from the card and salt the
   * voter sent; the referee accepts the card only if it matches the seal cast earlier.
   */
  | { type: "open-vote"; card: CardId; fingerprint: string }
  /** Sent by the referee's own session once every vote is open or the deadline passes. */
  | { type: "finish-reveal" }
  | { type: "start-timer"; durationMs: number }
  | { type: "stop-timer" }
  | { type: "end-room" };

/** Why the referee refused a command. The UI maps these to the messages in PRD 8.7. */
export type Refusal =
  | "not-host"
  | "not-in-room"
  | "room-ended"
  | "room-full"
  | "invalid-profile"
  | "invalid-title"
  | "story-limit"
  | "unknown-story"
  | "story-has-rounds"
  | "story-in-vote"
  | "no-active-story"
  | "round-closed"
  | "reveal-in-progress"
  | "no-votes"
  | "invalid-card"
  /** An opening that doesn't match its seal. The vote counts as not revealed. */
  | "seal-mismatch"
  | "invalid-timer"
  /** Raised by the host's connection layer before the referee sees the command (SDD 12). */
  | "rate-limited";
