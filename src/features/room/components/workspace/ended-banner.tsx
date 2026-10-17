"use client";

import { Flag } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/layout/container";
import { buttonStyles } from "@/components/ui/button";
import { formatDeletionTime } from "@/lib/format/clock";
import { useNow } from "@/lib/hooks/use-now";

/** An ended room is read-only until its deadline (PRD FR-022, 8.5 "Room ended"). */
export function EndedBanner({ expiresAt }: { expiresAt: number }) {
  const now = useNow(30_000);

  return (
    <div className="border-b border-line bg-night text-night-ink">
      <Container className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p role="status" className="flex items-start gap-2 text-sm">
          <Flag aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
          <span>
            <strong className="font-semibold text-white">This room has ended.</strong> Results and
            history stay readable here until it&apos;s deleted from every device{" "}
            {formatDeletionTime(expiresAt, now)}.
          </span>
        </p>
        <Link
          href="/"
          className={buttonStyles({
            variant: "secondary",
            size: "sm",
            className:
              "self-start border-night-line bg-night text-night-ink hover:bg-night-line sm:self-auto",
          })}
        >
          Back to My rooms
        </Link>
      </Container>
    </div>
  );
}
