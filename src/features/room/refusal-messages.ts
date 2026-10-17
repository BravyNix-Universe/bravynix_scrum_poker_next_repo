import type { Refusal } from "@/application/referee/room-command";
import { LIMITS } from "@/domain/rules/limits";
import { TIMER_MAX_MS, TIMER_MIN_MS } from "@/domain/rules/timer";
import { formatTimerDuration } from "@/lib/format/clock";

/**
 * What the person sees when the room refuses something they did (PRD 8.7, FR-056). The UI only
 * offers what the referee accepts, so these mostly appear when the room changed a moment before
 * the action arrived.
 */
export const REFUSAL_MESSAGES: Record<Refusal, string> = {
  "round-closed": "Voting for this round has closed.",
  "invalid-card": "That card isn't available.",
  "seal-mismatch": "Your vote couldn't be checked, so it wasn't revealed.",
  "not-host": "Only the host can do that.",
  "rate-limited": "You're sending changes too quickly. Please wait a moment.",
  "room-full": `This room is full (${LIMITS.maxParticipants} people).`,
  "story-limit": `This room has reached its limit of ${LIMITS.maxStories} stories.`,
  "room-ended": "This room has ended, so it can't be changed.",
  "not-in-room": "You're not in this room yet. Join it first.",
  "invalid-profile": `Names can be up to ${LIMITS.displayNameMaxLength} characters.`,
  "invalid-title": `Story titles need 1 to ${LIMITS.titleMaxLength} characters.`,
  "unknown-story": "That story isn't in this room any more.",
  "story-has-rounds": "A story that has been estimated can't be deleted. Remove it instead.",
  "story-in-vote": "That story is being estimated right now.",
  "no-active-story": "Choose a story to estimate first.",
  "reveal-in-progress": "Votes are being revealed. Try again in a moment.",
  "no-votes": "Reveal opens once someone votes.",
  "invalid-timer": `Timers run from ${formatTimerDuration(TIMER_MIN_MS)} to ${formatTimerDuration(TIMER_MAX_MS)}.`,
};
