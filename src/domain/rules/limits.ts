/** Product limits from PRD v1.1. Defined once and shared by every module (SDD section 9). */
export const LIMITS = {
  /** Epic and story titles, in user-perceived characters after trimming (PRD 13.2). */
  titleMaxLength: 160,
  /** Optional display name, in user-perceived characters after trimming (PRD D-06). */
  displayNameMaxLength: 32,
  /** People online in one room, host included (PRD A-10). */
  maxParticipants: 50,
  /** Above this many people the host is advised to use a laptop (PRD FR-054). */
  laptopAdvisedAbove: 15,
  /** Stories in one room (PRD A-10). */
  maxStories: 500,
  /** A room is deleted from every device this long after it was created (PRD FR-023). */
  roomLifetimeMs: 24 * 60 * 60 * 1000,
} as const;
