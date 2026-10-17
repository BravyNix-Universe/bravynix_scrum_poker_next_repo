import { Check, Moon, Star } from "lucide-react";

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
import { cn } from "@/lib/cn";

export interface RosterProps {
  participants: readonly Participant[];
  me: ParticipantId;
  phase: RoomPhase;
  round: Round | null;
  className?: string;
}

type SeatStatus = "here" | "away" | "voted" | "thinking";

const STATUS_LABELS: Record<SeatStatus, string> = {
  here: "Here",
  away: "Away",
  voted: "Voted",
  thinking: "Thinking…",
};

/**
 * Everyone in the room with their status (PRD 8.3, FR-027). Before reveal it shows only who has
 * voted, never a value (FR-013). Status is written out, not shown by colour alone.
 */
export function Roster({ participants, me, phase, round, className }: RosterProps) {
  const online = participants.filter((person) => person.online).length;

  return (
    <section aria-labelledby="roster-title" className={className}>
      <h2
        id="roster-title"
        className="text-xs font-semibold tracking-wide text-ink-muted uppercase"
      >
        People here ({online})
      </h2>
      <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 md:grid-cols-6 lg:grid-cols-8">
        {participants.map((person) => (
          <Seat
            key={person.id}
            person={person}
            isMe={person.id === me}
            status={seatStatus(person, phase, round)}
          />
        ))}
      </ul>
    </section>
  );
}

function seatStatus(person: Participant, phase: RoomPhase, round: Round | null): SeatStatus {
  if (!person.online) return "away";
  if (phase !== "estimate" || !isExpectedVoter(round, person.id)) return "here";
  return hasVoted(round, person.id) ? "voted" : "thinking";
}

function Seat({
  person,
  isMe,
  status,
}: {
  person: Participant;
  isMe: boolean;
  status: SeatStatus;
}) {
  const name = displayNameOf(person);

  return (
    <li className="flex min-w-0 flex-col items-center gap-2 text-center">
      <div className="relative aspect-[3/4] w-full max-w-24">
        {status === "voted" ? (
          <>
            <VoteCard card={null} className="size-full" />
            <span
              aria-hidden
              className="absolute -top-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full bg-success text-white ring-2 ring-canvas"
            >
              <Check className="size-3.5" strokeWidth={3} />
            </span>
          </>
        ) : (
          <div
            className={cn(
              "flex size-full items-center justify-center rounded-xl border-2",
              status === "thinking"
                ? "border-dashed border-line-strong/60 bg-canvas-sunken"
                : "border-line bg-surface",
              status === "away" && "opacity-50",
              isMe && "border-primary",
            )}
          >
            {status === "thinking" ? (
              <span aria-hidden className="flex gap-1">
                {[0, 1, 2].map((dot) => (
                  <span
                    key={dot}
                    className="size-1.5 rounded-full bg-ink-subtle motion-safe:animate-pulse"
                    style={{ animationDelay: `${dot * 200}ms` }}
                  />
                ))}
              </span>
            ) : (
              <Avatar avatarId={person.avatarId} size="lg" />
            )}
          </div>
        )}
      </div>

      <div className="flex w-full min-w-0 flex-col items-center gap-0.5">
        <span className="flex max-w-full items-center gap-1 text-sm font-medium text-ink">
          {status === "voted" || status === "thinking" ? (
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
        <span className="inline-flex items-center gap-1 text-xs text-ink-muted">
          {isMe ? (
            <>
              <span className="font-semibold text-primary">You</span>
              <span aria-hidden>·</span>
            </>
          ) : null}
          {status === "away" ? <Moon aria-hidden className="size-3" /> : null}
          <span className={cn(status === "voted" && "font-semibold text-success")}>
            {STATUS_LABELS[status]}
          </span>
        </span>
      </div>
    </li>
  );
}
