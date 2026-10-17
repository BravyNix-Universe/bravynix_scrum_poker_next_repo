import { AVATARS, type AvatarId } from "@/domain/avatars/avatars";
import type { ParticipantId } from "@/domain/room/room";

/** A simulated person in a preview room. */
export interface Teammate {
  id: ParticipantId;
  displayName: string | null;
  avatarId: AvatarId | null;
}

/** The host a participant meets in the demo room. */
export const DEMO_HOST: Teammate = {
  id: "demo-host" as ParticipantId,
  displayName: "Priya",
  avatarId: "panda",
};
/** The core team: they join a host's room one by one, and fill the demo room. */
export const TEAMMATES: readonly Teammate[] = [
  { id: "demo-arjun" as ParticipantId, displayName: "Arjun", avatarId: "tiger" },
  { id: "demo-meera" as ParticipantId, displayName: "Meera", avatarId: "fox" },
  { id: "demo-rahul" as ParticipantId, displayName: "Rahul", avatarId: "man-beard-medium" },
  {
    id: "demo-ananya" as ParticipantId,
    displayName: "Ananya",
    avatarId: "woman-curly-hair-medium",
  },
  { id: "demo-vikram" as ParticipantId, displayName: "Vikram", avatarId: "owl" },
];

const CROWD_NAMES = [
  "Kavya",
  "Rohan",
  "Isha",
  "Aditya",
  "Neha",
  "Karan",
  "Pooja",
  "Siddharth",
  "Tanvi",
  "Nikhil",
  "Divya",
  "Varun",
  "Sneha",
  "Aryan",
  "Riya",
  "Manish",
  "Anjali",
  "Harsh",
  "Priyanka",
  "Yash",
  "Nisha",
  "Gaurav",
  "Shreya",
  "Akash",
  "Lakshmi",
  "Dev",
  "Meghna",
  "Sahil",
  "Farah",
  "Kabir",
  "Zoya",
  "Imran",
  "Tara",
  "Omkar",
  "Bhavna",
  "Rahim",
  "Esha",
  "Jai",
  "Leela",
  "Mohan",
  "Ira",
  "Naveen",
  "Anika",
  "Sunil",
] as const;

/**
 * Extra teammates for trying a busy room, up to the 50-person cap (PRD 12.4). Every seventh
 * one stays anonymous, as some people will.
 */
export function crowdTeammates(count: number): Teammate[] {
  return CROWD_NAMES.slice(0, count).map((name, index) => ({
    id: `demo-crowd-${index + 1}` as ParticipantId,
    displayName: index % 7 === 6 ? null : name,
    avatarId: index % 5 === 4 ? null : AVATARS[(index * 3) % AVATARS.length]!.id,
  }));
}
