import type { Profile } from "@/domain/room/profile";
import type { StoryId } from "@/domain/room/room";
import type { CardId } from "@/domain/rules/deck";

/**
 * Everything a device can ask of the room. Each command comes from one participant (the
 * actor); host commands are refused from anyone else (PRD FR-003). In Phase 5 these become
 * protocol messages, signed and ordered by the host's referee (SDD 12).
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
  /** Only that the actor voted travels to the referee, never the card (PRD 11.4). */
  | { type: "cast-vote" }
  | { type: "reveal" }
  | { type: "open-vote"; card: CardId }
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
  | "invalid-timer";
