import type { ReactNode } from "react";

import { Container } from "@/components/layout/container";
import { InitialsAvatar } from "@/components/ui/initials-avatar";
import { VoteCard } from "@/components/ui/vote-card";

import { HOW_IT_WORKS } from "../content";

/** Small, decorative illustrations, one per step, built from the design system's own parts. */
const ILLUSTRATIONS: readonly ReactNode[] = [
  <div key="create" className="flex w-full max-w-44 flex-col items-center gap-3">
    <div className="w-full rounded-md border border-line-strong bg-surface px-2.5 py-1.5 text-2xs text-ink-subtle">
      Sprint 42 refinement
    </div>
    <div className="h-2.5 w-16 rounded-full bg-primary-tint" />
  </div>,
  <div key="share" className="flex flex-col items-center gap-2">
    <div className="rounded-full border border-line bg-surface px-3 py-1 text-2xs font-medium text-ink">
      poker.bravynix.com/r/#k7Qx…
    </div>
    <div className="flex -space-x-1.5">
      <InitialsAvatar
        initials="R"
        tone="mint"
        className="size-6 text-2xs ring-2 ring-canvas-sunken"
      />
      <InitialsAvatar
        initials="A"
        tone="peach"
        className="size-6 text-2xs ring-2 ring-canvas-sunken"
      />
      <InitialsAvatar
        initials="P"
        tone="periwinkle"
        className="size-6 text-2xs ring-2 ring-canvas-sunken"
      />
    </div>
  </div>,
  <VoteCard key="vote" card={null} className="h-20 w-14" />,
  <div key="reveal" className="flex gap-3">
    <VoteCard card="3" className="h-18 w-12 [&>span]:text-xs" />
    <VoteCard card="5" className="h-18 w-12 [&>span]:text-xs" />
  </div>,
];

export function HowItWorks() {
  return (
    <section aria-labelledby="how-it-works-title" className="py-16 sm:py-20">
      <Container>
        <h2
          id="how-it-works-title"
          className="font-display text-3xl font-bold text-ink sm:text-4xl"
        >
          {HOW_IT_WORKS.title}
        </h2>
        <p className="mt-3 text-base text-ink-muted">{HOW_IT_WORKS.lead}</p>

        <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.steps.map((step, index) => (
            <li
              key={step.title}
              className="flex flex-col rounded-xl border border-line bg-surface p-6"
            >
              <div
                aria-hidden
                className="mb-6 flex h-28 items-center justify-center rounded-lg bg-canvas-sunken px-4"
              >
                {ILLUSTRATIONS[index]}
              </div>
              <h3 className="font-display text-lg font-semibold text-ink">
                {index + 1}. {step.title}
              </h3>
              <p className="mt-2 text-sm text-pretty text-ink-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
