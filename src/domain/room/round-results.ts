import {
  type MostCommon,
  type Spread,
  getMostCommon,
  getSpread,
  summarizeVotes,
  type VoteSummary,
} from "@/domain/rules/results";

import type { RoundOutcome } from "./room";

export interface RoundResults extends VoteSummary {
  notVotedCount: number;
  notRevealedCount: number;
  mostCommon: MostCommon | null;
  spread: Spread | null;
}

/** Everything the results panel and history show for a revealed round (PRD 8.5, 11.5). */
export function getRoundResults(outcome: RoundOutcome): RoundResults {
  const cards = outcome.votes.map((vote) => vote.card);
  const summary = summarizeVotes(cards);
  return {
    ...summary,
    notVotedCount: outcome.notVoted.length,
    notRevealedCount: outcome.notRevealed.length,
    mostCommon: getMostCommon(summary.distribution),
    spread: getSpread(cards),
  };
}
