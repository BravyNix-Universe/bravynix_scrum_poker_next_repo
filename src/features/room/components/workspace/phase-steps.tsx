import type { RoomPhase } from "@/domain/room/room";
import { cn } from "@/lib/cn";

const STEPS = [
  { phase: "discuss", label: "Discuss" },
  { phase: "estimate", label: "Estimate" },
  { phase: "review", label: "Review" },
] as const;

/** The Discuss / Estimate / Review indicator (PRD 8.3). The current step isn't shown by colour alone. */
export function PhaseSteps({ phase, className }: { phase: RoomPhase; className?: string }) {
  return (
    <ol
      aria-label="Round progress"
      className={cn("inline-flex rounded-full bg-canvas-sunken p-1", className)}
    >
      {STEPS.map((step) => {
        const current = step.phase === phase;
        return (
          <li
            key={step.phase}
            aria-current={current ? "step" : undefined}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold sm:px-4",
              current ? "bg-primary text-white shadow-card" : "text-ink-muted",
            )}
          >
            {current ? <span aria-hidden className="size-1.5 rounded-full bg-accent" /> : null}
            {step.label}
          </li>
        );
      })}
    </ol>
  );
}
