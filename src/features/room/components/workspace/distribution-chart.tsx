import { type CardId, DECK } from "@/domain/rules/deck";
import type { MostCommon } from "@/domain/rules/results";
import { cn } from "@/lib/cn";

export interface DistributionChartProps {
  distribution: ReadonlyMap<CardId, number>;
  mostCommon: MostCommon | null;
  className?: string;
}

/**
 * Votes per card in deck order (PRD 8.5). The most chosen cards are marked by colour and by a
 * heavier label, and screen readers get the same numbers as text.
 */
export function DistributionChart({ distribution, mostCommon, className }: DistributionChartProps) {
  const max = Math.max(1, ...distribution.values());

  return (
    <ol
      aria-label="Votes per card"
      className={cn("grid grid-cols-10 items-end gap-1.5", className)}
    >
      {DECK.map((card) => {
        const count = distribution.get(card.id) ?? 0;
        const top = mostCommon?.cards.includes(card.id) ?? false;
        return (
          <li key={card.id} className="flex h-full flex-col items-center justify-end gap-1">
            <span className="sr-only">
              {card.label}: {count === 1 ? "1 vote" : `${count} votes`}
            </span>
            <span aria-hidden className="text-xs font-semibold text-ink tabular-nums">
              {count > 0 ? count : ""}
            </span>
            <span
              aria-hidden
              className={cn(
                "w-full rounded-t-md",
                count === 0 ? "h-1 bg-surface-muted" : top ? "bg-accent" : "bg-primary",
              )}
              style={count > 0 ? { height: `${Math.max(12, (count / max) * 96)}px` } : undefined}
            />
            <span
              aria-hidden
              className={cn(
                "font-display text-xs",
                top ? "font-bold text-ink" : "font-medium text-ink-muted",
              )}
            >
              {card.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
