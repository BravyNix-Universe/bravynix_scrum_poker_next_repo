/**
 * The fixed V1 deck (PRD FR-011, 11.1). Values are stored in half-points so every
 * calculation stays in whole numbers (PRD 11.3).
 */
export const DECK = [
  { id: "0", label: "0", halfPoints: 0 },
  { id: "half", label: "½", halfPoints: 1 },
  { id: "1", label: "1", halfPoints: 2 },
  { id: "2", label: "2", halfPoints: 4 },
  { id: "3", label: "3", halfPoints: 6 },
  { id: "5", label: "5", halfPoints: 10 },
  { id: "8", label: "8", halfPoints: 16 },
  { id: "13", label: "13", halfPoints: 26 },
  { id: "20", label: "20", halfPoints: 40 },
  { id: "unsure", label: "?", halfPoints: null },
] as const;

export type Card = (typeof DECK)[number];
export type CardId = Card["id"];

const CARDS_BY_ID = new Map<string, Card>(DECK.map((card) => [card.id, card]));

export function isCardId(value: unknown): value is CardId {
  return typeof value === "string" && CARDS_BY_ID.has(value);
}

export function getCard(id: CardId): Card {
  const card = CARDS_BY_ID.get(id);
  if (!card) throw new Error(`Unknown card: ${id}`);
  return card;
}
