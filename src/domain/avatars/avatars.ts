/**
 * The built-in avatar set (PRD FR-005, SDD `avatars` module): people across skin tones plus
 * animals. IDs travel between devices, so they must never be renamed or reused. The images are
 * bundled under `public/avatars/<id>.svg` by `scripts/generate-avatars.mjs`.
 */
export const AVATARS = [
  { id: "woman-red-hair-light", label: "Woman with red hair, light skin tone" },
  { id: "man-light", label: "Man, light skin tone" },
  { id: "woman-medium-light", label: "Woman, medium-light skin tone" },
  { id: "older-person-medium-light", label: "Older person, medium-light skin tone" },
  { id: "man-beard-medium", label: "Man with a beard, medium skin tone" },
  { id: "woman-curly-hair-medium", label: "Woman with curly hair, medium skin tone" },
  { id: "man-medium-dark", label: "Man, medium-dark skin tone" },
  { id: "woman-headscarf-medium-dark", label: "Woman with a headscarf, medium-dark skin tone" },
  { id: "woman-dark", label: "Woman, dark skin tone" },
  { id: "man-curly-hair-dark", label: "Man with curly hair, dark skin tone" },
  { id: "panda", label: "Panda" },
  { id: "tiger", label: "Tiger" },
  { id: "fox", label: "Fox" },
  { id: "cat", label: "Cat" },
  { id: "dog", label: "Dog" },
  { id: "koala", label: "Koala" },
  { id: "owl", label: "Owl" },
  { id: "penguin", label: "Penguin" },
  { id: "frog", label: "Frog" },
  { id: "rabbit", label: "Rabbit" },
] as const;

export type Avatar = (typeof AVATARS)[number];
export type AvatarId = Avatar["id"];

const AVATARS_BY_ID = new Map<string, Avatar>(AVATARS.map((avatar) => [avatar.id, avatar]));

/** Unknown IDs (for example from a newer app version) show no avatar (SDD section 9). */
export function isAvatarId(value: unknown): value is AvatarId {
  return typeof value === "string" && AVATARS_BY_ID.has(value);
}

export function getAvatar(id: AvatarId): Avatar {
  const avatar = AVATARS_BY_ID.get(id);
  if (!avatar) throw new Error(`Unknown avatar: ${id}`);
  return avatar;
}
