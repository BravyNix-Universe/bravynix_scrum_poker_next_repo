import { type CardId, DECK, getCard } from "./deck";

export interface VoteSummary {
  /** Votes with a numeric card (0 and ½ included). */
  numericCount: number;
  /** Votes with the ? card: submitted, but excluded from the average. */
  unsureCount: number;
  /** Sum of numeric votes in half-points, kept as an integer to avoid floating-point error. */
  sumHalfPoints: number;
  /** Average for display, or null when there are no numeric votes ("No numeric estimate"). */
  displayAverage: string | null;
  /** Votes per card, in deck order. */
  distribution: ReadonlyMap<CardId, number>;
}

/**
 * Summarises revealed votes (PRD 11.2, 11.3, FR-016 to FR-019).
 * Non-voters and unrevealed votes are not passed in, so they never affect the result.
 */
export function summarizeVotes(votes: readonly CardId[]): VoteSummary {
  const distribution = new Map<CardId, number>();
  let numericCount = 0;
  let unsureCount = 0;
  let sumHalfPoints = 0;

  for (const id of votes) {
    distribution.set(id, (distribution.get(id) ?? 0) + 1);
    const { halfPoints } = getCard(id);
    if (halfPoints === null) {
      unsureCount += 1;
    } else {
      numericCount += 1;
      sumHalfPoints += halfPoints;
    }
  }

  return {
    numericCount,
    unsureCount,
    sumHalfPoints,
    displayAverage: numericCount === 0 ? null : formatAverage(sumHalfPoints, numericCount),
    distribution,
  };
}

export interface MostCommon {
  /** Every card that shares the top count, in deck order. */
  cards: CardId[];
  count: number;
}

/**
 * The most chosen card or cards, ? included. A fact about the votes, never a decision: the app
 * doesn't pick a consensus or round to a card (PRD 4.1, 11.3).
 */
export function getMostCommon(distribution: ReadonlyMap<CardId, number>): MostCommon | null {
  let count = 0;
  for (const value of distribution.values()) count = Math.max(count, value);
  if (count === 0) return null;
  return {
    cards: DECK.map((card) => card.id).filter((id) => distribution.get(id) === count),
    count,
  };
}

export interface Spread {
  low: CardId;
  high: CardId;
}

/** The lowest and highest numeric cards played, or null with no numeric votes. */
export function getSpread(votes: readonly CardId[]): Spread | null {
  const numeric = DECK.filter((card) => card.halfPoints !== null && votes.includes(card.id));
  const low = numeric[0];
  const high = numeric[numeric.length - 1];
  return low && high ? { low: low.id, high: high.id } : null;
}

/**
 * Formats sum / count to at most two decimals, rounding half-up and trimming trailing zeros
 * (FR-019). Integer arithmetic only: the average is (sumHalfPoints / 2) / count.
 */
export function formatAverage(sumHalfPoints: number, count: number): string {
  if (
    !Number.isInteger(sumHalfPoints) ||
    !Number.isInteger(count) ||
    count <= 0 ||
    sumHalfPoints < 0
  ) {
    throw new RangeError("formatAverage needs a non-negative integer sum and a positive count");
  }
  const numerator = sumHalfPoints * 100;
  const denominator = 2 * count;
  // floor(numerator / denominator + 1/2), i.e. round half-up for non-negative values.
  const hundredths = Math.floor((2 * numerator + denominator) / (2 * denominator));
  const whole = Math.floor(hundredths / 100);
  const fraction = (hundredths % 100).toString().padStart(2, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : `${whole}`;
}
