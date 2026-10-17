"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { ChangeProfileInput } from "@/application/room/change-profile";
import type { RoomView } from "@/application/room/room-view";
import { getChangeProfile, getMyRoomsRepository } from "@/composition/services";
import { getWaitingVoterIds, type ParticipantId, type StoryId } from "@/domain/room/room";
import type { CardId } from "@/domain/rules/deck";

import type { RoomSessionHandle } from "./use-room-session";

/** An action that waits for the person to confirm it (PRD A-01, FR-041, 9.6). */
export type PendingConfirmation =
  | { kind: "reveal-early"; waitingIds: readonly ParticipantId[] }
  | { kind: "switch-story"; storyId: StoryId }
  | { kind: "restart-round" }
  | { kind: "end-room" }
  | { kind: "delete-story"; storyId: StoryId }
  | { kind: "forget-room" };

export type RoomActions = ReturnType<typeof useRoomActions>;

/**
 * Every room action the UI offers, with the confirmations the PRD asks for. Components call
 * these and never decide on their own when to warn.
 */
export function useRoomActions(view: RoomView, handle: RoomSessionHandle) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingConfirmation | null>(null);
  const session = () => handle.current();
  const isVoting = view.round?.status === "voting";
  const isHost = view.participants.some((person) => person.id === view.me && person.isHost);

  function run(confirmation: PendingConfirmation): void {
    switch (confirmation.kind) {
      case "reveal-early":
        session()?.reveal();
        return;
      case "switch-story":
        session()?.activateStory(confirmation.storyId);
        return;
      case "restart-round":
        session()?.startRound();
        return;
      case "end-room":
        session()?.endRoom();
        return;
      case "delete-story":
        session()?.deleteStory(confirmation.storyId);
        return;
      case "forget-room":
        // A host deleting an open room ends it for everyone first (PRD 13, deletion triggers).
        if (isHost && view.status === "active") session()?.endRoom();
        getMyRoomsRepository().remove(view.roomId);
        router.push("/");
        return;
    }
  }

  return {
    pending,
    cancelPending: () => setPending(null),
    confirmPending: () => {
      if (pending) run(pending);
      setPending(null);
    },

    castVote: (card: CardId) => session()?.castVote(card),
    changeProfile: (input: ChangeProfileInput) => {
      const current = session();
      if (current) getChangeProfile()(current, input);
    },

    addStory: (title: string) => session()?.addStory(title),
    renameStory: (storyId: StoryId, title: string) => session()?.renameStory(storyId, title),
    moveStory: (storyId: StoryId, toIndex: number) => session()?.moveStory(storyId, toIndex),
    removeStory: (storyId: StoryId) => session()?.removeStory(storyId),
    restoreStory: (storyId: StoryId) => session()?.restoreStory(storyId),
    deleteStory: (storyId: StoryId) => setPending({ kind: "delete-story", storyId }),

    /** Switching story mid-vote cancels the round, so it asks first (FR-041). */
    activateStory: (storyId: StoryId) =>
      isVoting ? setPending({ kind: "switch-story", storyId }) : session()?.activateStory(storyId),
    startRound: () => (isVoting ? setPending({ kind: "restart-round" }) : session()?.startRound()),
    /** Revealing before everyone expected has voted needs a confirmation (PRD A-01). */
    reveal: () => {
      const waitingIds = view.round ? getWaitingVoterIds(view.round) : [];
      if (waitingIds.length > 0) setPending({ kind: "reveal-early", waitingIds });
      else session()?.reveal();
    },

    startTimer: (durationMs: number) => session()?.startTimer(durationMs),
    stopTimer: () => session()?.stopTimer(),
    endRoom: () => setPending({ kind: "end-room" }),
    forgetRoom: () => setPending({ kind: "forget-room" }),
  };
}
