import type { CSSProperties, ReactNode } from "react";

import { type CardId, getCard } from "@/domain/rules/deck";
import { cn } from "@/lib/cn";

const FACE_STYLES: Record<CardId, string> = {
  "0": "bg-vote-0 text-white",
  half: "bg-vote-half text-white",
  "1": "bg-vote-1 text-white",
  "2": "bg-vote-2 text-white",
  "3": "bg-vote-3 text-white",
  "5": "bg-vote-5 text-white",
  "8": "bg-vote-8 text-white",
  "13": "bg-vote-13 text-ink",
  "20": "bg-vote-20 text-ink",
  unsure: "bg-vote-unsure text-white",
};

export interface VoteCardProps {
  /** The revealed card, or null for a face-down card. */
  card: CardId | null;
  /** Optional content in the middle of the card, such as the voter's avatar and name. */
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

/**
 * A playing card in the design's tactile style: value in two corners, flat colour, crisp edge.
 * The corner values are hidden from screen readers; give the card an accessible name where used.
 */
export function VoteCard({ card, children, className, style }: VoteCardProps) {
  if (card === null) {
    return (
      <div
        className={cn("relative rounded-xl bg-card-back p-1.5 shadow-card", className)}
        style={style}
      >
        <div className="size-full rounded-lg border border-primary/80" />
      </div>
    );
  }

  const { label } = getCard(card);
  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-xl p-2 font-display shadow-sm",
        FACE_STYLES[card],
        className,
      )}
      style={style}
    >
      <span aria-hidden className="text-lg leading-none font-bold">
        {label}
      </span>
      {children ? <div className="flex min-w-0 flex-col items-center">{children}</div> : null}
      <span aria-hidden className="rotate-180 text-lg leading-none font-bold">
        {label}
      </span>
    </div>
  );
}
