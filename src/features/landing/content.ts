import { LIMITS } from "@/domain/rules/limits";

/** Landing page copy, kept apart from layout so wording can change without touching markup. */

const ROOM_HOURS = LIMITS.roomLifetimeMs / (60 * 60 * 1000);

export const HERO = {
  title: "Scrum Poker in one link",
  lead: `Create a room, share the link, vote in private and reveal together. No sign-up. Each room deletes itself after ${ROOM_HOURS} hours.`,
  formNote: `No login required • Free forever • Auto-deletes in ${ROOM_HOURS}h`,
} as const;

export const HOW_IT_WORKS = {
  title: "How it works",
  lead: "A clean, predictable flow designed for quick grooming calls.",
  steps: [
    {
      title: "Create a room",
      body: "Enter an Epic name and get a private room link in seconds.",
    },
    {
      title: "Share the link",
      body: "Teammates join instantly with no sign-up or accounts.",
    },
    {
      title: "Vote in private",
      body: "Pick a card from the deck. Votes stay hidden from everyone.",
    },
    {
      title: "Reveal together",
      body: "The host flips all cards at once to show every vote and the average.",
    },
  ],
} as const;

export const TRUST_POINTS = [
  { id: "accounts", text: "No accounts. Pick a name if you like." },
  {
    id: "privacy",
    text: "Votes stay hidden until the host reveals them, even from the host.",
  },
  {
    id: "retention",
    text: `Nothing is stored on our servers. Rooms delete themselves after ${ROOM_HOURS} hours.`,
  },
] as const;

export const FAQ = [
  {
    question: "Is it free?",
    answer: `Yes. Bravynix Scrum Poker is free, with no account and no sign-up. Each room holds up to ${LIMITS.maxParticipants} people.`,
  },
  {
    question: "What happens if the host leaves?",
    answer:
      "Voting pauses until the host is back, and everyone can still read the results and history. The host can return in the same browser, or open their private host link on another device.",
  },
  {
    question: "How many people can join?",
    answer: `Up to ${LIMITS.maxParticipants} people, including the host. For rooms of more than about 15 people, the host should use a laptop or desktop and keep the room tab open.`,
  },
  {
    question: "Where is my data stored?",
    answer: `Only in the browsers of the people in the room. Bravynix stores no room data on its servers, and every device deletes the room ${ROOM_HOURS} hours after it was created.`,
  },
  {
    question: "Why can't someone connect?",
    answer:
      "Bravynix connects browsers directly to the host. Some office networks and VPNs block this. Switching to another network, such as a phone hotspot, usually solves it.",
  },
] as const;
