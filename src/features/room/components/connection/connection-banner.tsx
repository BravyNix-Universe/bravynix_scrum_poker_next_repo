import { LoaderCircle, Pause } from "lucide-react";

import type { ConnectionStatus } from "@/application/room/room-session-state";
import { NoticeBar } from "@/components/ui/notice-bar";

/**
 * Says when this device has lost the room or the host is away (PRD 8.5, FR-047, FR-057). The
 * room announcer tells screen readers, so the banner itself isn't a live region.
 */
export function ConnectionBanner({
  connection,
}: {
  connection: Exclude<ConnectionStatus, "connected">;
}) {
  if (connection === "reconnecting") {
    return (
      <NoticeBar tone="danger" icon={<LoaderCircle className="motion-safe:animate-spin" />}>
        <strong className="font-semibold">Connection lost.</strong> Reconnecting… Your vote
        isn&apos;t recorded until you&apos;re back.
      </NoticeBar>
    );
  }

  return (
    <NoticeBar tone="primary" icon={<Pause />}>
      <strong className="font-semibold">Waiting for the host.</strong> Voting is paused and history
      stays readable. The room picks up again when they&apos;re back.
    </NoticeBar>
  );
}
