"use client";

import { Check, Copy } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";

import { cn } from "@/lib/cn";

import { Button } from "./button";

type CopyStatus = "idle" | "copied" | "failed";

const RESET_AFTER_MS = 2500;
/** Characters kept visible at the end when a long value is truncated, so IDs stay readable. */
const VISIBLE_TAIL_LENGTH = 12;

export interface CopyFieldProps {
  label: ReactNode;
  /** The full value placed on the clipboard. */
  value: string;
  /** What is shown on screen, for example a masked secret. Defaults to `value`. */
  displayValue?: string;
  copyLabel: string;
  hint?: ReactNode;
  className?: string;
}

/** A read-only value with a copy button and an announced copy confirmation (PRD FR-033). */
export function CopyField({
  label,
  value,
  displayValue,
  copyLabel,
  hint,
  className,
}: CopyFieldProps) {
  const [status, setStatus] = useState<CopyStatus>("idle");
  const fallbackRef = useRef<HTMLInputElement>(null);
  const labelId = useId();
  const hintId = useId();
  const shown = displayValue ?? value;
  const tailStart = Math.max(0, shown.length - VISIBLE_TAIL_LENGTH);

  useEffect(() => {
    if (status !== "copied") return;
    const id = window.setTimeout(() => setStatus("idle"), RESET_AFTER_MS);
    return () => window.clearTimeout(id);
  }, [status]);

  useEffect(() => {
    if (status === "failed") fallbackRef.current?.select();
  }, [status]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <span id={labelId} className="text-sm font-semibold text-primary-strong">
        {label}
      </span>
      <div className="flex items-center gap-2 rounded-lg bg-canvas-sunken p-1.5 pl-4">
        <span className="flex min-w-0 flex-1 text-sm text-ink" title={shown}>
          <span className="truncate">{shown.slice(0, tailStart)}</span>
          <span className="shrink-0 whitespace-nowrap">{shown.slice(tailStart)}</span>
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={copy}
          aria-describedby={hint ? `${labelId} ${hintId}` : labelId}
          className={cn("border-transparent", status === "copied" && "text-success")}
        >
          {status === "copied" ? (
            <Check aria-hidden className="size-4" />
          ) : (
            <Copy aria-hidden className="size-4" />
          )}
          {status === "copied" ? "Copied" : copyLabel}
        </Button>
      </div>
      {status === "failed" ? (
        <div className="flex flex-col gap-1">
          <p className="text-xs text-danger">
            Couldn&apos;t copy automatically. Select the link and copy it.
          </p>
          <input
            ref={fallbackRef}
            readOnly
            value={value}
            aria-labelledby={labelId}
            className="h-9 rounded-md border border-line-strong bg-surface px-3 text-xs"
            onFocus={(event) => event.currentTarget.select()}
          />
        </div>
      ) : null}
      {hint ? (
        <p id={hintId} className="text-xs text-ink-muted">
          {hint}
        </p>
      ) : null}
      <span role="status" className="sr-only">
        {status === "copied" ? "Link copied to clipboard" : ""}
      </span>
    </div>
  );
}
