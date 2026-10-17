import type { SessionProblem } from "@/application/room/room-session-state";
import { LIMITS } from "@/domain/rules/limits";

export interface ProblemCopy {
  title: string;
  body: readonly string[];
  /** What the main button does: connect again, or reload the app. */
  action: "retry" | "refresh";
}

/**
 * What each connection failure says (PRD 8.5, 8.7, 16). Network problems suggest another
 * network, and none of them reveals anything about the room.
 */
export const PROBLEM_COPY: Record<SessionProblem, ProblemCopy> = {
  "service-unreachable": {
    title: "Can't reach the connection service",
    body: [
      "Browsers in a room find each other through a connection service, and it isn't answering from here.",
      "Try again in a moment, or switch to another network, such as a phone hotspot.",
    ],
    action: "retry",
  },
  "host-unreachable": {
    title: "Can't connect to the host from this network",
    body: [
      "Some office and school networks block direct connections between browsers.",
      "Try another network, such as a phone hotspot, then try again.",
    ],
    action: "retry",
  },
  "host-unverified": {
    title: "Couldn't verify the host",
    body: [
      "The browser running this room couldn't prove it's the room's host, so you haven't joined.",
      "Ask your host to check the link, or to start a new room.",
    ],
    action: "retry",
  },
  "room-full": {
    title: `This room is full (${LIMITS.maxParticipants} people)`,
    body: ["You can join once someone leaves."],
    action: "retry",
  },
  "open-elsewhere": {
    title: "This room is open in another tab or device",
    body: ["A room can be hosted from one place at a time. Close it there, then try again here."],
    action: "retry",
  },
  "outdated-app": {
    title: "A newer version of Bravynix is available",
    body: ["Please refresh. Everyone in a room needs the same version of the app."],
    action: "refresh",
  },
  "unsupported-browser": {
    title: "This browser can't join live rooms",
    body: [
      "Rooms connect browsers to each other directly, and this browser doesn't allow it.",
      "Open the link in an up-to-date Chrome, Edge, Firefox or Safari.",
    ],
    action: "refresh",
  },
};
