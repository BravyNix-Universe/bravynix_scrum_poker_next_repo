import { EyeOff, type LucideIcon, Timer, UserRoundX } from "lucide-react";

import { Container } from "@/components/layout/container";

import { TRUST_POINTS } from "../content";

const ICONS: Record<(typeof TRUST_POINTS)[number]["id"], LucideIcon> = {
  accounts: UserRoundX,
  privacy: EyeOff,
  retention: Timer,
};

export function TrustStrip() {
  return (
    <section aria-label="Privacy at a glance" className="border-y border-line bg-canvas-sunken">
      <Container>
        <ul className="grid gap-6 py-8 md:grid-cols-3 md:gap-8">
          {TRUST_POINTS.map((point) => {
            const Icon = ICONS[point.id];
            return (
              <li key={point.id} className="flex items-start gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <Icon aria-hidden className="size-5" />
                </span>
                <p className="pt-2 text-sm text-pretty text-ink sm:text-base">{point.text}</p>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
