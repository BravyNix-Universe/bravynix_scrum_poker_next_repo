import { FlaskConical } from "lucide-react";

import type { SimulatedScenario } from "@/application/ports/room-session-simulation";
import { Button } from "@/components/ui/button";

interface Scenario {
  scenario: SimulatedScenario;
  label: string;
  /** Who can run into it. */
  for: "everyone" | "host" | "participant";
}

const IN_ROOM: readonly Scenario[] = [
  { scenario: "connection-drop", label: "Drop my connection", for: "everyone" },
  { scenario: "host-away", label: "Host steps away", for: "participant" },
  { scenario: "host-back", label: "Host comes back", for: "participant" },
  { scenario: "waiting-for-host", label: "Wait for the host to open", for: "participant" },
  { scenario: "crowd", label: "24 more people join", for: "everyone" },
  { scenario: "rate-limited", label: "Send changes too quickly", for: "everyone" },
];

const FAILURES: readonly Scenario[] = [
  { scenario: "service-unreachable", label: "Service unreachable", for: "everyone" },
  { scenario: "host-unreachable", label: "Network blocks the host", for: "participant" },
  { scenario: "host-unverified", label: "Host not verified", for: "participant" },
  { scenario: "room-full", label: "Room full", for: "participant" },
  { scenario: "open-elsewhere", label: "Open in another tab", for: "host" },
  { scenario: "outdated-app", label: "Outdated app", for: "everyone" },
];

/**
 * Preview only: acts out connection problems so each screen can be reviewed without a network.
 * Live rooms don't show this.
 */
export function PreviewControls({
  isHost,
  onSimulate,
}: {
  isHost: boolean;
  onSimulate: (scenario: SimulatedScenario) => void;
}) {
  const applies = (item: Scenario) =>
    item.for === "everyone" || item.for === (isHost ? "host" : "participant");

  return (
    <section
      aria-labelledby="preview-controls-title"
      className="mt-6 rounded-xl border border-accent/40 bg-accent-soft p-4"
    >
      <h3
        id="preview-controls-title"
        className="flex items-center gap-2 text-sm font-semibold text-accent-ink"
      >
        <FlaskConical aria-hidden className="size-4" />
        Preview: act out a situation
      </h3>
      <ScenarioGroup title="In the room" items={IN_ROOM.filter(applies)} onSimulate={onSimulate} />
      <ScenarioGroup
        title="Can't connect"
        items={FAILURES.filter(applies)}
        onSimulate={onSimulate}
      />
    </section>
  );
}

function ScenarioGroup({
  title,
  items,
  onSimulate,
}: {
  title: string;
  items: readonly Scenario[];
  onSimulate: (scenario: SimulatedScenario) => void;
}) {
  return (
    <div role="group" aria-label={title} className="mt-3">
      <p className="text-xs font-semibold text-ink-muted">{title}</p>
      <div className="mt-1.5 flex flex-wrap gap-2">
        {items.map((item) => (
          <Button
            key={item.scenario}
            variant="secondary"
            size="sm"
            onClick={() => onSimulate(item.scenario)}
          >
            {item.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
