import { LIMITS } from "./limits";

const segmenter =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

/** Counts user-perceived characters, so "👩🏽‍💻" or "क्षि" count as one each (PRD 13.2). */
export function countCharacters(value: string): number {
  if (!segmenter) return Array.from(value).length;
  return Array.from(segmenter.segment(value)).length;
}

export type TitleError = "empty" | "too-long";

export type TitleResult = { ok: true; value: string } | { ok: false; error: TitleError };

/** Validates an Epic or story title: 1 to 160 characters after trimming (FR-001, FR-008). */
export function validateTitle(raw: string): TitleResult {
  const value = raw.trim();
  const length = countCharacters(value);
  if (length === 0) return { ok: false, error: "empty" };
  if (length > LIMITS.titleMaxLength) return { ok: false, error: "too-long" };
  return { ok: true, value };
}
