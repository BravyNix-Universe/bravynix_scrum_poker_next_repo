"use client";

import { Check, Share2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import type { RoomId } from "@/domain/room/room-identity";
import { buildParticipantLink } from "@/domain/room/room-links";

const RESET_AFTER_MS = 2500;

/** Copies the participant link, which never contains the host key (PRD FR-033). */
export function InviteButton({ roomId }: { roomId: RoomId }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (status === "idle") return;
    const id = window.setTimeout(() => setStatus("idle"), RESET_AFTER_MS);
    return () => window.clearTimeout(id);
  }, [status]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(buildParticipantLink(window.location.origin, roomId));
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  }

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        onClick={copy}
        aria-label="Copy invite link"
        title="Copy invite link"
        className="max-sm:w-9 max-sm:px-0"
      >
        {status === "copied" ? (
          <Check aria-hidden className="size-4 text-success" />
        ) : (
          <Share2 aria-hidden className="size-4" />
        )}
        <span aria-hidden className="max-sm:hidden">
          {status === "copied" ? "Copied" : "Invite"}
        </span>
      </Button>
      <span role="status" className="sr-only">
        {status === "copied"
          ? "Invite link copied to clipboard"
          : status === "failed"
            ? "Couldn't copy the invite link"
            : ""}
      </span>
    </>
  );
}
