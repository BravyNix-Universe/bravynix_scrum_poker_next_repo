"use client";

import { Users } from "lucide-react";
import { useState } from "react";

import type { JoinRoomInput } from "@/application/room/join-room";
import type { RoomLobby } from "@/application/room/room-view";
import { Container } from "@/components/layout/container";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getProfilePreferences } from "@/composition/services";
import { displayNameOf } from "@/domain/room/profile";

import { JoinForm } from "./join-form";
import { LobbySidebar } from "./lobby-sidebar";

export interface JoinScreenProps {
  lobby: RoomLobby;
  onJoin: (input: JoinRoomInput) => Promise<void>;
}

/** The join view: Epic name, optional name and avatar, and who's already here (PRD 9.2). */
export function JoinScreen({ lobby, onJoin }: JoinScreenProps) {
  const [remembered] = useState(() => getProfilePreferences().load());
  const host = lobby.participants.find((person) => person.isHost);
  const others = lobby.participants.length;
  const isHost = lobby.role === "host";

  return (
    <Container className="grid gap-6 py-8 sm:py-12 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-8">
      <section
        aria-labelledby="join-title"
        className="rounded-2xl border border-line bg-surface p-6 shadow-card sm:p-8"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold tracking-wide text-ink-muted uppercase">
            {isHost ? "You're hosting" : "You're joining"}
          </p>
          {others > 0 ? (
            <Badge tone="primary">
              <Users aria-hidden className="size-3" />
              {others === 1 ? "1 person here" : `${others} people here`}
            </Badge>
          ) : null}
        </div>
        <h1
          id="join-title"
          className="mt-2 font-display text-3xl font-bold break-words text-primary-strong sm:text-4xl"
        >
          {lobby.epicTitle}
        </h1>
        {host ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-ink-muted">
            <Avatar avatarId={host.avatarId} size="xs" />
            Hosted by <span className="font-semibold text-ink">{displayNameOf(host)}</span>
          </p>
        ) : (
          <p className="mt-3 text-sm text-ink-muted">
            Choose how your team sees you. You can skip both and stay anonymous.
          </p>
        )}

        <JoinForm lobby={lobby} remembered={remembered} onJoin={onJoin} />
      </section>

      <LobbySidebar lobby={lobby} />
    </Container>
  );
}
