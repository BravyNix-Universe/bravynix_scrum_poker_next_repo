import { cn } from "@/lib/cn";

export type AvatarTone = "mint" | "peach" | "periwinkle" | "rose" | "lilac";

const TONE_STYLES: Record<AvatarTone, string> = {
  mint: "bg-avatar-mint",
  peach: "bg-avatar-peach",
  periwinkle: "bg-avatar-periwinkle",
  rose: "bg-avatar-rose",
  lilac: "bg-avatar-lilac",
};

export interface InitialsAvatarProps {
  initials: string;
  tone?: AvatarTone;
  className?: string;
}

/** A pastel circle with initials, used in illustrations until the bundled avatar set lands. */
export function InitialsAvatar({ initials, tone = "periwinkle", className }: InitialsAvatarProps) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-ink",
        TONE_STYLES[tone],
        className,
      )}
    >
      {initials}
    </span>
  );
}
