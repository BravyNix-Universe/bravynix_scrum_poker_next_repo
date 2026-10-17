"use client";

import { X } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef } from "react";

import { cn } from "@/lib/cn";

import { IconButton } from "./icon-button";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  className?: string;
}

/**
 * Modal dialog on the native <dialog> element: the browser traps focus, makes the page inert
 * and closes on Escape. A click on the scrim also closes it.
 */
export function Dialog({ open, onClose, title, description, children, className }: DialogProps) {
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
        "m-auto w-[calc(100%-2rem)] max-w-lg overflow-hidden rounded-2xl border border-t-4 border-line border-t-primary bg-surface p-0 text-ink shadow-overlay backdrop:bg-ink/40",
        className,
      )}
    >
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <h2
            id={titleId}
            className="font-display text-2xl font-bold text-primary-strong sm:text-3xl"
          >
            {title}
          </h2>
          <IconButton label="Close" onClick={onClose} className="-mt-1 -mr-2">
            <X aria-hidden className="size-5" />
          </IconButton>
        </div>
        {description ? (
          <div id={descriptionId} className="mt-1 text-sm text-ink-muted sm:text-base">
            {description}
          </div>
        ) : null}
        {children}
      </div>
    </dialog>
  );
}
