"use client";

import type { RoomView } from "@/application/room/room-view";
import { ConfirmDialog, type ConfirmDialogProps } from "@/components/ui/confirm-dialog";
import { displayNameOf } from "@/domain/room/profile";
import { formatDeletionTime } from "@/lib/format/clock";
import { useNow } from "@/lib/hooks/use-now";

import type { PendingConfirmation } from "../../use-room-actions";

export interface RoomConfirmDialogProps {
  view: RoomView;
  pending: PendingConfirmation | null;
  onConfirm: () => void;
  onCancel: () => void;
}

type Copy = Pick<ConfirmDialogProps, "title" | "description" | "confirmLabel" | "tone">;

/** The wording for each confirmation in PRD 9.3, 9.4, 9.5 and 9.6. */
export function RoomConfirmDialog({ view, pending, onConfirm, onCancel }: RoomConfirmDialogProps) {
  const now = useNow(30_000);
  const copy = pending ? describe(view, pending, now) : null;
  return (
    <ConfirmDialog
      open={copy !== null}
      title={copy?.title}
      description={copy?.description}
      confirmLabel={copy?.confirmLabel ?? ""}
      tone={copy?.tone}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}

function describe(view: RoomView, pending: PendingConfirmation, now: number): Copy {
  const round = view.round;
  const discarded = round
    ? `Votes in round ${round.number} are discarded and never revealed. History keeps it as a cancelled round.`
    : "";
  const isMe = (id: string) => id === view.me;
  const nameOf = (id: string) => {
    const person = view.participants.find((p) => p.id === id);
    return person ? displayNameOf(person) : "Someone";
  };
  const storyTitle = (id: string) => view.stories.find((s) => s.id === id)?.title ?? "this story";

  switch (pending.kind) {
    case "reveal-early": {
      const names = pending.waitingIds.filter((id) => !isMe(id)).map(nameOf);
      const count = pending.waitingIds.length;
      return {
        title: "Reveal votes now?",
        description: `${count === 1 ? "1 person hasn't" : `${count} people haven't`} voted yet${
          names.length > 0 ? `: ${names.join(", ")}` : ""
        }. They'll show as "not voted" in this round.`,
        confirmLabel: "Reveal votes",
        tone: "accent",
      };
    }
    case "switch-story":
      return {
        title: "Switch story and cancel this round?",
        description: `“${storyTitle(pending.storyId)}” becomes the active story. ${discarded}`,
        confirmLabel: "Switch story",
      };
    case "restart-round":
      return {
        title: "Start a new round and cancel this one?",
        description: discarded,
        confirmLabel: "Start new round",
      };
    case "end-room":
      return {
        title: "End this room?",
        description: `Voting and host actions stop${
          round?.status === "voting" ? " and the open round is cancelled" : ""
        }. Everyone can still read the results and history until the room is deleted from every device ${formatDeletionTime(view.expiresAt, now)}.`,
        confirmLabel: "End room",
        tone: "danger",
      };
    case "delete-story":
      return {
        title: "Delete this story?",
        description: `“${storyTitle(pending.storyId)}” has no rounds yet, so it's deleted for good.`,
        confirmLabel: "Delete story",
        tone: "danger",
      };
    case "forget-room":
      return {
        title: "Delete this room from this device?",
        description: !view.participants.some((p) => p.id === view.me && p.isHost)
          ? `“${view.epicTitle}” is removed from this device. You can rejoin with the invite link while the room is open.`
          : view.status === "active"
            ? `“${view.epicTitle}” ends for everyone and is removed from this device. Participants keep read-only copies until it's deleted ${formatDeletionTime(view.expiresAt, now)}.`
            : `“${view.epicTitle}” is removed from this device. Participants keep read-only copies until it's deleted ${formatDeletionTime(view.expiresAt, now)}.`,
        confirmLabel: "Delete from this device",
        tone: "danger",
      };
  }
}
