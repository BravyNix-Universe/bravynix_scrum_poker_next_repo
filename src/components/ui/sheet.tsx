"use client";

import { X } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef } from "react";

import { cn } from "@/lib/cn";

import { IconButton } from "./icon-button";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  side?: "left" | "right";
  children?: ReactNode;
  /** Pinned below the scrolling content. */
  footer?: ReactNode;
}

/**
 * A full-height side panel on the native <dialog> element, so focus trapping, inertness and
 * Escape work as in `Dialog`. Full width on phones (PRD 8.4). The content mounts only while
 * open, so a long queue costs nothing while the panel is closed.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  side = "right",
  children,
  footer,
}: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn(
        "my-0 h-dvh max-h-dvh w-full max-w-md flex-col overflow-hidden border-line bg-surface p-0 text-ink shadow-panel backdrop:bg-ink/40 open:flex",
        "motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out",
        side === "right"
          ? "mr-0 ml-auto border-l motion-safe:starting:open:translate-x-full"
          : "mr-auto ml-0 border-r motion-safe:starting:open:-translate-x-full",
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 id={titleId} className="font-display text-xl font-bold text-primary-strong">
            {title}
          </h2>
          {description ? (
            <div id={descriptionId} className="mt-0.5 text-sm text-ink-muted">
              {description}
            </div>
          ) : null}
        </div>
        <IconButton label="Close" onClick={onClose} className="-mr-2">
          <X aria-hidden className="size-5" />
        </IconButton>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
        {open ? children : null}
      </div>
      {open && footer ? (
        <div className="border-t border-line px-5 py-4 sm:px-6">{footer}</div>
      ) : null}
    </dialog>
  );
}
