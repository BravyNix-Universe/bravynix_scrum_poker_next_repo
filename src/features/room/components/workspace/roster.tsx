import { Check, EyeOff, LoaderCircle, Minus, Moon, Star } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { VoteCard } from "@/components/ui/vote-card";
import { displayNameOf } from "@/domain/room/profile";
import {
  hasVoted,
  isExpectedVoter,
  type Participant,
  type ParticipantId,
  type RoomPhase,
  type Round,
} from "@/domain/room/room";
import { type CardId, getCard } from "@/domain/rules/deck";
import { cn } from "@/lib/cn";

export interface RosterProps {
  participants: readonly Participant[];
  me: ParticipantId;
  phase: RoomPhase;
  round: Round | null;
  /** While this device can't reach the host, the host shows as away (FR-047). */
  hostAway?: boolean;
  className?: string;
}

type Seat =
  | { status: "here" | "away" | "voted" | "thinking" | "revealing" | "not-voted" | "not-revealed" }
  | { status: "revealed"; card: CardId };

const STATUS_LABELS: Record<Seat["status"], string> = {
  here: "Here",
  away: "Away",
  voted: "Voted",
  thinking: "Thinking…",
  revealing: "Revealing…",
  revealed: "Voted",
  "not-voted": "Not voted",
  "not-revealed": "Not revealed",
};

/** Above this many people the roster switches to smaller seats, so a full room stays scannable. */
const COMPACT_ABOVE = 12;

/**
 * Everyone in the room with their status (PRD 8.3, FR-027). Before reveal it shows only who has
 * voted, never a value (FR-013); after reveal each card turns face up. Status is written out,
 * not shown by colour alone.
 */
export function Roster({
  participants,
  me,
  phase,
  round,
  hostAway = false,
  className,
}: RosterProps) {
  const present = (person: Participant) => person.online && !(hostAway && person.isHost);
  const online = participants.filter(present).length;
  const compact = participants.length > COMPACT_ABOVE;
  const seats = participants.map((person) => ({
    person,
    seat: seatOf(person, present(person), phase, round),
  }));
  // Revealed cards turn over one after another, in roster order.
  const revealOrder = seats
    .filter(({ seat }) => seat.status === "revealed")
    .map(({ person }) => person.id);

  return (
    <section aria-labelledby="roster-title" className={className}>
      <h2
        id="roster-title"
        className="text-xs font-semibold tracking-wide text-ink-muted uppercase"
      >
        People here ({online})
      </h2>
      <ul
        className={cn(
          "mt-3 grid",
          compact
            ? "grid-cols-4 gap-x-2 gap-y-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12"
            : "grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-6 lg:grid-cols-8",
        )}
      >
        {seats.map(({ person, seat }) => (
          <SeatView
            key={person.id}
            person={person}
            isMe={person.id === me}
            seat={seat}
            compact={compact}
            revealIndex={revealOrder.indexOf(person.id)}
          />
        ))}
      </ul>
    </section>
  );
}

function seatOf(person: Participant, online: boolean, phase: RoomPhase, round: Round | null): Seat {
  if (phase === "review" && round?.outcome) {
    const vote = round.outcome.votes.find((item) => item.participantId === person.id);
    if (vote) return { status: "revealed", card: vote.card };
    if (round.outcome.notRevealed.some((item) => item.participantId === person.id)) {
      return { status: "not-revealed" };
    }
    if (round.outcome.notVoted.some((item) => item.participantId === person.id)) {
      return { status: "not-voted" };
    }
  }
  if (!online) return { status: "away" };
  if (phase !== "estimate" || !isExpectedVoter(round, person.id)) return { status: "here" };
  const voted = hasVoted(round, person.id);
  if (round?.status === "revealing") return { status: voted ? "revealing" : "not-voted" };
  return { status: voted ? "voted" : "thinking" };
}

function SeatView({
  person,
  isMe,
  seat,
  compact,
  revealIndex,
}: {
  person: Participant;
  isMe: boolean;
  seat: Seat;
  compact: boolean;
  revealIndex: number;
}) {
  const name = displayNameOf(person);
  const showsCard = ["voted", "revealing", "revealed"].includes(seat.status);

  return (
    <li
      className={cn("flex min-w-0 flex-col items-center text-center", compact ? "gap-1" : "gap-2")}
    >
      <div className={cn("relative aspect-[3/4] w-full", compact ? "max-w-16" : "max-w-24")}>
        {seat.status === "revealed" ? (
          <VoteCard
            card={seat.card}
            className={cn(
              "size-full motion-safe:animate-card-flip",
              compact ? "p-1.5 [&>span]:text-lg" : "p-2.5 [&>span]:text-2xl",
            )}
            style={{ animationDelay: `${revealIndex * 70}ms` }}
          />
        ) : showsCard ? (
          <>
            <VoteCard card={null} className="size-full" />
            <span
              aria-hidden
              className={cn(
                "absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full bg-success text-white ring-2 ring-canvas",
                compact ? "size-5" : "size-6",
              )}
            >
              {seat.status === "revealing" ? (
                <LoaderCircle className="size-3.5 motion-safe:animate-spin" strokeWidth={3} />
              ) : (
                <Check className="size-3.5" strokeWidth={3} />
              )}
            </span>
          </>
        ) : (
          <EmptySeat person={person} isMe={isMe} seat={seat} compact={compact} />
        )}
      </div>

      <div className="flex w-full min-w-0 flex-col items-center gap-0.5">
        <span
          className={cn(
            "flex max-w-full items-center gap-1 font-medium text-ink",
            compact ? "text-xs" : "text-sm",
          )}
        >
          {!compact && (showsCard || seat.status === "thinking") ? (
            <Avatar avatarId={person.avatarId} size="xs" />
          ) : null}
          {person.isHost ? (
            <>
              <Star aria-hidden className="size-3.5 shrink-0 fill-accent text-accent-ink" />
              <span className="sr-only">Host:</span>
            </>
          ) : null}
          <span className="truncate" title={name}>
            {name}
          </span>
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1 text-ink-muted",
            compact ? "text-2xs" : "text-xs",
          )}
        >
          {isMe ? (
            <>
              <span className="font-semibold text-primary">You</span>
              <span aria-hidden>·</span>
            </>
          ) : null}
          {seat.status === "away" ? <Moon aria-hidden className="size-3" /> : null}
          <span
            className={cn(
              (seat.status === "voted" || seat.status === "revealed") &&
                "font-semibold text-success",
            )}
          >
            {STATUS_LABELS[seat.status]}
            {seat.status === "revealed" ? (
              <span className="sr-only"> {getCard(seat.card).label}</span>
            ) : null}
          </span>
        </span>
      </div>
    </li>
  );
}

function EmptySeat({
  person,
  isMe,
  seat,
  compact,
}: {
  person: Participant;
  isMe: boolean;
  seat: Seat;
  compact: boolean;
}) {
  const dashed = seat.status === "thinking" || seat.status === "not-voted";
  return (
    <div
      className={cn(
        "flex size-full items-center justify-center rounded-xl border-2",
        dashed ? "border-dashed border-line-strong/60 bg-canvas-sunken" : "border-line bg-surface",
        seat.status === "away" && "opacity-50",
        isMe && "border-primary",
      )}
    >
      {seat.status === "thinking" ? (
        <span aria-hidden className="flex gap-1">
          {[0, 1, 2].map((dot) => (
            <span
              key={dot}
              className="size-1.5 rounded-full bg-ink-subtle motion-safe:animate-pulse"
              style={{ animationDelay: `${dot * 200}ms` }}
            />
          ))}
        </span>
      ) : seat.status === "not-voted" ? (
        <Minus aria-hidden className="size-6 text-ink-subtle" />
      ) : seat.status === "not-revealed" ? (
        <EyeOff aria-hidden className="size-6 text-ink-subtle" />
      ) : (
        <Avatar avatarId={person.avatarId} size={compact ? "md" : "lg"} />
      )}
    </div>
  );
}
