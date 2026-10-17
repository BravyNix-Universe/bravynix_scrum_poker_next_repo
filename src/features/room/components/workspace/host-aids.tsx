"use client";

import { EyeOff, Laptop } from "lucide-react";
import { useEffect, useState } from "react";

import { NoticeBar } from "@/components/ui/notice-bar";
import { SITE } from "@/config/site";
import { LIMITS } from "@/domain/rules/limits";
import { useDocumentHidden } from "@/lib/hooks/use-document-hidden";
import { useMediaQuery } from "@/lib/hooks/use-media-query";
import { useScreenWakeLock } from "@/lib/hooks/use-screen-wake-lock";

/** Phones and tablets: narrow screens or touch as the main pointer. */
const HANDHELD_QUERY = "(max-width: 1023px), (pointer: coarse)";
const HIDDEN_TAB_TITLE = `Keep this tab open: you're hosting | ${SITE.shortName}`;

export interface HostAidsProps {
  /** True for the host of an active room. */
  hosting: boolean;
  /** People online, host included. */
  onlineCount: number;
}

/**
 * Helps the host keep the room running (PRD FR-054): keeps the screen awake, flags the tab in
 * the tab strip while it's hidden and explains afterwards, and suggests a laptop for big rooms
 * on a phone or tablet. Participants depend on the host's tab, which browsers slow down in the
 * background.
 */
export function HostAids({ hosting, onlineCount }: HostAidsProps) {
  const hidden = useDocumentHidden();
  const handheld = useMediaQuery(HANDHELD_QUERY);
  const [wasHidden, setWasHidden] = useState(false);
  const [dismissed, setDismissed] = useState({ hiddenTab: false, laptop: false });

  useScreenWakeLock(hosting);

  if (hosting && hidden && !wasHidden) setWasHidden(true);

  useEffect(() => {
    if (!hosting || !hidden) return;
    const title = document.title;
    document.title = HIDDEN_TAB_TITLE;
    return () => {
      document.title = title;
    };
  }, [hosting, hidden]);

  if (!hosting) return null;
  const adviseLaptop = handheld && onlineCount > LIMITS.laptopAdvisedAbove && !dismissed.laptop;
  const warnHiddenTab = wasHidden && !hidden && !dismissed.hiddenTab;
  if (!adviseLaptop && !warnHiddenTab) return null;

  return (
    <>
      {warnHiddenTab ? (
        <NoticeBar
          tone="accent"
          icon={<EyeOff />}
          onDismiss={() => setDismissed((value) => ({ ...value, hiddenTab: true }))}
        >
          <strong className="font-semibold">This tab was in the background.</strong> Participants
          may have seen delays: the room runs in your tab, so keep it open and visible while you
          host.
        </NoticeBar>
      ) : null}
      {adviseLaptop ? (
        <NoticeBar
          tone="accent"
          icon={<Laptop />}
          onDismiss={() => setDismissed((value) => ({ ...value, laptop: true }))}
        >
          <strong className="font-semibold">
            More than {LIMITS.laptopAdvisedAbove} people are here.
          </strong>{" "}
          A laptop or desktop hosts big rooms more reliably than a phone or tablet.
        </NoticeBar>
      ) : null}
    </>
  );
}
