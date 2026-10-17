import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

export interface IconButtonProps extends Omit<ComponentProps<"button">, "aria-label"> {
  /** Required: icon-only buttons need an accessible name. */
  label: string;
}

export function IconButton({ label, className, type = "button", ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink motion-reduce:transition-none",
        className,
      )}
      {...props}
    />
  );
}
