import { X } from "lucide-react";
import type { ReactNode } from "react";

import { Container } from "@/components/layout/container";
import { cn } from "@/lib/cn";

import { IconButton } from "./icon-button";

export type NoticeTone = "accent" | "primary" | "danger";

const TONE_STYLES: Record<NoticeTone, string> = {
  accent: "border-accent/40 bg-accent-soft text-accent-ink",
  primary: "border-primary/20 bg-primary-soft text-primary-strong",
  danger: "border-danger/30 bg-danger-soft text-danger",
};

export interface NoticeBarProps {
  tone: NoticeTone;
  icon: ReactNode;
  children: ReactNode;
  /** Shows a Dismiss button. */
  onDismiss?: () => void;
}

/** A full-width message strip under the page header. */
export function NoticeBar({ tone, icon, children, onDismiss }: NoticeBarProps) {
  return (
    <div className={cn("border-b", TONE_STYLES[tone])}>
      <Container className="flex items-start gap-2 py-2 text-sm sm:items-center">
        <span aria-hidden className="mt-0.5 shrink-0 sm:mt-0 [&>svg]:size-4">
          {icon}
        </span>
        <p className="flex-1 py-0.5">{children}</p>
        {onDismiss ? (
          <IconButton
            label="Dismiss"
            onClick={onDismiss}
            className="-my-1 -mr-2 size-8 text-current hover:bg-white/60 hover:text-current"
          >
            <X aria-hidden className="size-4" />
          </IconButton>
        ) : null}
      </Container>
    </div>
  );
}
