import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "primary" | "success" | "warning";

const TONE_STYLES: Record<BadgeTone, string> = {
  neutral: "bg-surface-muted text-ink-muted",
  primary: "bg-primary-soft text-primary",
  success: "bg-success-soft text-success",
  warning: "bg-accent-soft text-accent-ink",
};

export interface BadgeProps extends ComponentProps<"span"> {
  tone?: BadgeTone;
}

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-2xs font-semibold whitespace-nowrap",
        TONE_STYLES[tone],
        className,
      )}
      {...props}
    />
  );
}
