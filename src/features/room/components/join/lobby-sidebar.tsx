import { Clock3, EyeOff } from "lucide-react";

import type { RoomLobby } from "@/application/room/room-view";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { VoteCard } from "@/components/ui/vote-card";
import { displayNameOf } from "@/domain/room/profile";
import { DECK } from "@/domain/rules/deck";

import { RoomCountdown } from "../room-countdown";

/** Context beside the join form: time left, who's already here and the deck. */
export function LobbySidebar({ lobby }: { lobby: RoomLobby }) {
  const people = lobby.participants;

  return (
    <aside aria-label="About this room" className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-5 py-4 text-sm text-ink">
        <Clock3 aria-hidden className="size-4 shrink-0 text-primary" />
        <RoomCountdown expiresAt={lobby.expiresAt} />
      </div>

      <section
        aria-labelledby="lobby-people"
        className="rounded-2xl border border-line bg-surface p-5"
      >
        <h2 id="lobby-people" className="font-display text-lg font-bold text-primary-strong">
          Who&apos;s here
        </h2>
        {people.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">
            Nobody else yet. Share the invite link once you&apos;re in.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {people.map((person) => (
              <li key={person.id} className="flex items-center gap-3">
                <Avatar avatarId={person.avatarId} size="sm" />
                <span className="min-w-0 truncate text-sm text-ink">{displayNameOf(person)}</span>
                {person.isHost ? <Badge tone="warning">Host</Badge> : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        aria-labelledby="lobby-deck"
        className="rounded-2xl border border-line bg-surface p-5"
      >
        <h2 id="lobby-deck" className="font-display text-lg font-bold text-primary-strong">
          The deck
        </h2>
        <ul
          className="mt-3 grid grid-cols-5 gap-2 md:grid-cols-10 lg:grid-cols-5"
          aria-label="Cards in the deck"
        >
          {DECK.map((card) => (
            <li key={card.id}>
              <VoteCard
                card={card.id}
                className="aspect-[3/4] w-full p-1.5 [&>span]:text-sm [&>span:last-child]:hidden"
              />
              <span className="sr-only">{card.label}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 flex gap-2 text-xs text-ink-muted">
          <EyeOff aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          Votes stay hidden until the host reveals them, even from the host.
        </p>
      </section>
    </aside>
  );
}
