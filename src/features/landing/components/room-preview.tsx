import { InitialsAvatar, type AvatarTone } from "@/components/ui/initials-avatar";
import { VoteCard } from "@/components/ui/vote-card";
import { type CardId, DECK, getCard } from "@/domain/rules/deck";
import { summarizeVotes } from "@/domain/rules/results";

const EXAMPLE_VOTES: ReadonlyArray<{
  name: string;
  initials: string;
  tone: AvatarTone;
  card: CardId;
  host?: boolean;
}> = [
  { name: "Rahul", initials: "R", tone: "mint", card: "2" },
  { name: "Arjun", initials: "A", tone: "peach", card: "3" },
  { name: "Priya", initials: "P", tone: "periwinkle", card: "5", host: true },
  { name: "Meera", initials: "M", tone: "rose", card: "5" },
  { name: "Ananya", initials: "An", tone: "lilac", card: "8" },
];

/** A static illustration of a revealed round. Its numbers come from the real calculation rules. */
export function RoomPreview() {
  const summary = summarizeVotes(EXAMPLE_VOTES.map((vote) => vote.card));
  const votedNumericCards = DECK.filter(
    (card) => card.halfPoints !== null && summary.distribution.has(card.id),
  );
  const [mostCommonCard, mostCommonCount] = [...summary.distribution.entries()].reduce(
    (best, entry) => (entry[1] > best[1] ? entry : best),
  );
  const mostCommonShare = Math.round((mostCommonCount / EXAMPLE_VOTES.length) * 100);

  return (
    <figure
      aria-label={`Example of a revealed round: ${EXAMPLE_VOTES.length} votes, average ${summary.displayAverage}.`}
      className="rounded-3xl border border-night-line bg-night p-5 shadow-panel sm:p-7"
    >
      <div aria-hidden>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-night-line pb-4 text-xs text-night-ink">
          <span className="inline-flex items-center gap-2 font-medium">
            <span className="size-2 rounded-full bg-accent" />
            Example room • Checkout revamp
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-success" />
            {EXAMPLE_VOTES.length} votes revealed
          </span>
        </div>

        <div className="mb-5 rounded-2xl bg-surface p-4 text-ink sm:p-5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-ink-subtle">Story 3 of 5</span>
            <span className="rounded-full bg-success-soft px-2.5 py-0.5 text-2xs font-semibold text-success">
              Estimated
            </span>
          </div>
          <p className="mb-4 font-display text-lg font-semibold sm:text-xl">
            Show delivery ETA on the order page
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-canvas-sunken p-3">
            <p className="flex items-baseline gap-2">
              <span className="font-display text-2xl leading-none font-bold text-primary-strong sm:text-3xl">
                Average {summary.displayAverage}
              </span>
              <span className="text-xs text-ink-subtle">points</span>
            </p>
            <span className="text-xs font-medium text-ink-muted">
              {summary.numericCount} numeric votes
            </span>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-2 sm:gap-2.5">
          {EXAMPLE_VOTES.map((vote) => (
            <VoteCard key={vote.name} card={vote.card} className="h-24 sm:h-28">
              <InitialsAvatar
                initials={vote.initials}
                tone={vote.tone}
                className="mb-1 size-7 sm:size-8"
              />
              <span className="max-w-full truncate font-sans text-2xs opacity-95">
                {vote.name}
                {vote.host ? " ★" : ""}
              </span>
            </VoteCard>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap justify-between gap-2 text-xs text-night-ink">
          <span>
            Spread: {votedNumericCards[0]?.label} to {votedNumericCards.at(-1)?.label}
          </span>
          <span>
            Most common: {getCard(mostCommonCard).label} ({mostCommonShare}%)
          </span>
        </div>
      </div>
    </figure>
  );
}
