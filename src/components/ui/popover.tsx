"use client";

import { type ReactNode, useCallback, useEffect, useId, useRef, useState } from "react";

import { cn } from "@/lib/cn";

const FOCUSABLE =
  'button:not(:disabled), [href], input:not(:disabled), [tabindex]:not([tabindex="-1"])';

export interface PopoverTriggerProps {
  id: string;
  onClick: () => void;
  "aria-expanded": boolean;
  "aria-controls": string;
}

export interface PopoverProps {
  /** Renders the button that opens the panel; spread the props onto it. */
  trigger: (props: PopoverTriggerProps) => ReactNode;
  /** Accessible name of the panel. */
  label: string;
  align?: "start" | "end";
  className?: string;
  children: (close: () => void) => ReactNode;
}

/**
 * A small non-modal panel anchored to its trigger (a disclosure). It closes on Escape, on a
 * click outside and when focus leaves it; Escape returns focus to the trigger.
 */
export function Popover({ trigger, label, align = "end", className, children }: PopoverProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const triggerId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    document.getElementById(triggerId)?.focus();
  }, [triggerId]);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (panel) keepInViewport(panel);
    (panel?.querySelector<HTMLElement>(FOCUSABLE) ?? panel)?.focus();

    function onPointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      {trigger({
        id: triggerId,
        onClick: () => setOpen((value) => !value),
        "aria-expanded": open,
        "aria-controls": panelId,
      })}
      {open ? (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label={label}
          tabIndex={-1}
          className={cn(
            "absolute top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-surface p-4 text-ink shadow-overlay",
            align === "end" ? "right-0" : "left-0",
            className,
          )}
        >
          {children(close)}
        </div>
      ) : null}
    </div>
  );
}

const VIEWPORT_MARGIN_PX = 16;

/** On narrow screens a trigger can sit too far in for the panel to fit; nudge it back in. */
function keepInViewport(panel: HTMLElement): void {
  panel.style.translate = "";
  const { left, right } = panel.getBoundingClientRect();
  const overflowLeft = VIEWPORT_MARGIN_PX - left;
  const overflowRight = right - (window.innerWidth - VIEWPORT_MARGIN_PX);
  const shift = overflowLeft > 0 ? overflowLeft : overflowRight > 0 ? -overflowRight : 0;
  if (shift !== 0) panel.style.translate = `${shift}px 0`;
}
