import type { RoundOutcome } from "@/domain/room/room";
import { getRoundResults } from "@/domain/room/round-results";
import { getCard } from "@/domain/rules/deck";

import { DistributionChart } from "./distribution-chart";

export interface ResultsPanelProps {
  outcome: RoundOutcome;
  roundNumber: number;
}

/**
 * The revealed result (PRD 8.5, 11): the average of numeric votes, never rounded to a card,
 * with the numeric, ?, not-voted and not-revealed counts beside it and the distribution.
 */
export function ResultsPanel({ outcome, roundNumber }: ResultsPanelProps) {
  const results = getRoundResults(outcome);
  const label = (count: number, one: string, many: string) => (count === 1 ? one : many);

  const facts = [
    results.mostCommon
      ? `Most common: ${results.mostCommon.cards.map((id) => getCard(id).label).join(", ")} (${label(results.mostCommon.count, "1 vote", `${results.mostCommon.count} votes`)})`
      : null,
    results.spread && results.spread.low !== results.spread.high
      ? `Spread ${getCard(results.spread.low).label}–${getCard(results.spread.high).label}`
      : null,
  ].filter(Boolean);

  return (
    <section
      aria-labelledby="results-title"
      className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6"
    >
      <h2 id="results-title" className="sr-only">
        Results of round {roundNumber}
      </h2>
      <div className="grid gap-6 sm:grid-cols-2 sm:items-center lg:grid-cols-[minmax(10rem,auto)_auto_minmax(0,1fr)] lg:gap-8">
        <div>
          <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">Average</p>
          {results.displayAverage ? (
            <p className="font-display text-6xl leading-none font-bold text-primary-strong tabular-nums">
              {results.displayAverage}
            </p>
          ) : (
            <p className="mt-1 font-display text-2xl font-bold text-primary-strong">
              No numeric estimate
            </p>
          )}
          <p className="mt-2 text-sm text-ink-muted">
            {results.numericCount === 0
              ? "Nobody played a numeric card."
              : `From ${label(results.numericCount, "1 numeric vote", `${results.numericCount} numeric votes`)}`}
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-line sm:border-l sm:pl-6 lg:border-r lg:px-8">
          <Fact term="Numeric votes" value={results.numericCount} />
          <Fact term="? votes" value={results.unsureCount} />
          <Fact term="Not voted" value={results.notVotedCount} />
          <Fact term="Not revealed" value={results.notRevealedCount} />
        </dl>

        <div className="sm:col-span-2 lg:col-span-1">
          <DistributionChart
            distribution={results.distribution}
            mostCommon={results.mostCommon}
            className="h-36"
          />
          {facts.length > 0 ? (
            <p className="mt-3 text-sm text-ink-muted">{facts.join(" · ")}</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Fact({ term, value }: { term: string; value: number }) {
  return (
    <div className="flex flex-col-reverse">
      <dt className="text-xs text-ink-muted">{term}</dt>
      <dd className="font-display text-2xl font-bold text-ink tabular-nums">{value}</dd>
    </div>
  );
}
