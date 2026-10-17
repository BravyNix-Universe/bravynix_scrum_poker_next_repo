import { Lock } from "lucide-react";

import { VoteCard } from "@/components/ui/vote-card";
import { type Card, type CardId, DECK } from "@/domain/rules/deck";
import { cn } from "@/lib/cn";

export interface CardDeckProps {
  enabled: boolean;
  selected: CardId | null;
  onSelect: (card: CardId) => void;
  className?: string;
}

/**
 * The fixed deck as a radio group (PRD FR-011, 8.6): arrow keys move between cards, each card has
 * an accessible name, and the selection is marked with a lift, a ring and a "Your vote" tag.
 */
export function CardDeck({ enabled, selected, onSelect, className }: CardDeckProps) {
  const hint = !enabled
    ? "Cards unlock when the host starts estimation."
    : selected
      ? "Pick another card to change your vote."
      : "Pick a card to vote. Nobody sees it until the host reveals.";

  return (
    <section
      aria-labelledby="deck-title"
      className={cn("rounded-2xl border border-line bg-surface p-4 sm:p-6", className)}
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <h2 id="deck-title" className="font-display text-lg font-bold text-primary-strong">
          Your card
        </h2>
        <p id="deck-hint" className="flex items-center gap-1.5 text-xs text-ink-muted">
          {!enabled ? <Lock aria-hidden className="size-3.5" /> : null}
          {hint}
        </p>
      </div>

      <fieldset
        disabled={!enabled}
        aria-describedby="deck-hint"
        className="mt-5 grid grid-cols-5 gap-x-2 gap-y-7 sm:gap-x-3 md:grid-cols-10 md:gap-y-3"
      >
        <legend className="sr-only">Your card</legend>
        {DECK.map((card) => {
          const checked = card.id === selected;
          return (
            <label
              key={card.id}
              className={cn(
                "relative block transition-transform duration-150 motion-reduce:transition-none",
                enabled ? "cursor-pointer hover:-translate-y-1" : "cursor-not-allowed opacity-40",
                checked && "-translate-y-2 hover:-translate-y-2",
              )}
            >
              <input
                type="radio"
                name="vote"
                value={card.id}
                checked={checked}
                onChange={() => onSelect(card.id)}
                aria-label={cardName(card)}
                className="peer sr-only"
              />
              <VoteCard
                card={card.id}
                className={cn(
                  "aspect-[3/4] w-full sm:p-2.5 [&>span]:text-xl sm:[&>span]:text-2xl",
                  "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary",
                  checked && "ring-4 ring-accent ring-offset-2 ring-offset-surface",
                )}
              />
              {checked ? (
                <span
                  aria-hidden
                  className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-2 py-0.5 text-2xs font-bold whitespace-nowrap text-ink shadow-card"
                >
                  Your vote
                </span>
              ) : null}
            </label>
          );
        })}
      </fieldset>
    </section>
  );
}

function cardName(card: Card): string {
  if (card.halfPoints === null) return "? (not sure)";
  if (card.id === "half") return "½ point";
  return card.id === "1" ? "1 point" : `${card.label} points`;
}
