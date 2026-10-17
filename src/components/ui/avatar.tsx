import { UserRound } from "lucide-react";
import Image from "next/image";

import { type AvatarId, getAvatar } from "@/domain/avatars/avatars";
import { cn } from "@/lib/cn";

export type AvatarSize = "xs" | "sm" | "md" | "lg";

const SIZE_STYLES: Record<AvatarSize, string> = {
  xs: "size-6",
  sm: "size-8",
  md: "size-11",
  lg: "size-14",
};

export interface AvatarProps {
  /** null shows the anonymous placeholder (PRD FR-005). */
  avatarId: AvatarId | null;
  size?: AvatarSize;
  /** Announce the avatar by name. By default it is decorative, next to a visible name. */
  labelled?: boolean;
  className?: string;
}

/** A bundled avatar on a soft circle, or a neutral person icon when there is none. */
export function Avatar({ avatarId, size = "md", labelled = false, className }: AvatarProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-primary-soft",
        SIZE_STYLES[size],
        className,
      )}
    >
      {avatarId ? (
        <Image
          src={`/avatars/${avatarId}.svg`}
          alt={labelled ? getAvatar(avatarId).label : ""}
          width={64}
          height={64}
          draggable={false}
          className="size-[72%] select-none"
        />
      ) : (
        <UserRound
          aria-hidden={!labelled}
          aria-label={labelled ? "No avatar" : undefined}
          className="size-1/2 text-ink-subtle"
        />
      )}
    </span>
  );
}
