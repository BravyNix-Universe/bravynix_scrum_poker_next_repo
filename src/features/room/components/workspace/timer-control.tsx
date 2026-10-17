"use client";

import { Minus, Play, Plus, RotateCcw, Square, Timer } from "lucide-react";
import { type ReactNode, useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, type PopoverTriggerProps } from "@/components/ui/popover";
import type { RoomTimer } from "@/domain/room/room";
import {
  clampTimerDuration,
  getTimerRemainingMs,
  getTimerStatus,
  TIMER_MAX_MS,
  TIMER_MIN_MS,
  TIMER_PRESETS_MS,
  TIMER_STEP_MS,
  type TimerStatus,
} from "@/domain/rules/timer";
import { cn } from "@/lib/cn";
import { formatTimerClock, formatTimerDuration } from "@/lib/format/clock";
import { useNow } from "@/lib/hooks/use-now";

const DEFAULT_DURATION_MS = 120_000;
const TICK_MS = 250;

const CHIP_STYLES: Record<TimerStatus, string> = {
  off: "border-line bg-surface text-ink hover:bg-surface-muted",
  running: "border-primary/25 bg-primary-soft text-primary",
  warning: "border-accent bg-accent-soft text-accent-ink",
  expired: "border-danger/40 bg-danger-soft text-danger",
};

const ANNOUNCEMENTS: Record<TimerStatus, string> = {
  off: "",
  running: "",
  warning: "1 minute left on the timer.",
  expired: "Time's up. Voting continues until the host reveals.",
};

export interface TimerControlProps {
  timer: RoomTimer | null;
  /** The host gets the controls; everyone else sees the countdown while it runs. */
  canHost: boolean;
  onStart: (durationMs: number) => void;
  onStop: () => void;
}

/**
 * The optional round timer (PRD 12.5, FR-028, FR-036). It never reveals or closes voting: at
 * zero it shows "Time's up" and tells screen readers, then waits for the host.
 */
export function TimerControl({ timer, canHost, onStart, onStop }: TimerControlProps) {
  const now = useNow(TICK_MS, timer !== null);
  const status = getTimerStatus(timer, now);
  const remainingMs = timer ? getTimerRemainingMs(timer, now) : 0;

  const announcer = (
    <span role="status" className="sr-only">
      {ANNOUNCEMENTS[status]}
    </span>
  );

  if (!canHost) {
    if (!timer) return null;
    return (
      <>
        <span className={chipClass(status)}>
          <TimerFace status={status} remainingMs={remainingMs} />
        </span>
        {announcer}
      </>
    );
  }

  return (
    <>
      <Popover
        label="Round timer"
        trigger={(props: PopoverTriggerProps) => (
          <button type="button" {...props} className={cn(chipClass(status), "cursor-pointer")}>
            <TimerFace status={status} remainingMs={remainingMs} />
          </button>
        )}
      >
        {(close) => (
          <TimerPanel
            timer={timer}
            onStart={(durationMs) => {
              onStart(durationMs);
              close();
            }}
            onStop={() => {
              onStop();
              close();
            }}
          />
        )}
      </Popover>
      {announcer}
    </>
  );
}

function chipClass(status: TimerStatus): string {
  return cn(
    "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold whitespace-nowrap transition-colors motion-reduce:transition-none",
    CHIP_STYLES[status],
  );
}

function TimerFace({ status, remainingMs }: { status: TimerStatus; remainingMs: number }) {
  const clock = formatTimerClock(remainingMs);
  if (status === "off") {
    return (
      <>
        <Timer aria-hidden className="size-4" />
        <span className="max-sm:sr-only">Timer</span>
      </>
    );
  }
  if (status === "expired") {
    return (
      <>
        <Timer aria-hidden className="size-4 motion-safe:animate-pulse" />
        Time&apos;s up
      </>
    );
  }
  return (
    <>
      <Timer aria-hidden className="size-4" />
      <span className="sr-only">Timer, {clock} left</span>
      <span aria-hidden className="font-display text-sm tabular-nums">
        {clock}
      </span>
    </>
  );
}

function TimerPanel({
  timer,
  onStart,
  onStop,
}: {
  timer: RoomTimer | null;
  onStart: (durationMs: number) => void;
  onStop: () => void;
}) {
  const [durationMs, setDurationMs] = useState(timer?.durationMs ?? DEFAULT_DURATION_MS);
  const step = (delta: number) => setDurationMs(clampTimerDuration(durationMs + delta));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-base font-bold text-primary-strong">Round timer</h2>
        <p className="mt-0.5 text-xs text-ink-muted">
          A countdown for the room. It never reveals votes or closes voting.
        </p>
      </div>

      <div role="group" aria-label="Presets" className="grid grid-cols-4 gap-2">
        {TIMER_PRESETS_MS.map((preset) => (
          <button
            key={preset}
            type="button"
            aria-pressed={durationMs === preset}
            onClick={() => setDurationMs(preset)}
            className={cn(
              "h-9 rounded-lg border text-xs font-semibold transition-colors motion-reduce:transition-none",
              durationMs === preset
                ? "border-primary bg-primary text-white"
                : "border-line bg-surface text-ink hover:bg-surface-muted",
            )}
          >
            {formatTimerDuration(preset)}
          </button>
        ))}
      </div>

      <div>
        <p className="text-xs font-semibold text-ink-muted">Custom</p>
        <div className="mt-1.5 flex items-center justify-between gap-2 rounded-lg border border-line bg-canvas-sunken p-1">
          <StepButton
            label="30 seconds less"
            disabled={durationMs <= TIMER_MIN_MS}
            onClick={() => step(-TIMER_STEP_MS)}
          >
            <Minus aria-hidden className="size-4" />
          </StepButton>
          <output aria-live="polite" className="text-sm font-semibold text-ink tabular-nums">
            {formatTimerDuration(durationMs)}
          </output>
          <StepButton
            label="30 seconds more"
            disabled={durationMs >= TIMER_MAX_MS}
            onClick={() => step(TIMER_STEP_MS)}
          >
            <Plus aria-hidden className="size-4" />
          </StepButton>
        </div>
      </div>

      {timer ? (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" size="sm" onClick={onStop}>
            <Square aria-hidden className="size-3.5" />
            Stop
          </Button>
          <Button size="sm" onClick={() => onStart(durationMs)}>
            <RotateCcw aria-hidden className="size-3.5" />
            Restart
          </Button>
        </div>
      ) : (
        <Button size="sm" onClick={() => onStart(durationMs)}>
          <Play aria-hidden className="size-3.5" />
          Start {formatTimerDuration(durationMs)}
        </Button>
      )}
    </div>
  );
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex size-8 items-center justify-center rounded-md bg-surface text-ink shadow-card hover:bg-surface-muted disabled:opacity-40"
    >
      {children}
    </button>
  );
}
