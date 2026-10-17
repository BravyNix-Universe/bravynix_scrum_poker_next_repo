"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import type { SimulatedScenario } from "@/application/ports/room-session-simulation";
import { describeDiagnostics, formatDiagnostics } from "@/application/room/diagnostics";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { APP_VERSION } from "@/config/app";
import { PROTOCOL_VERSION } from "@/domain/protocol/version";

import { PreviewControls } from "./preview-controls";
import { type RoomSessionHandle, useConnectionDiagnostics } from "../../use-room-session";

type CopyStatus = "idle" | "copied" | "failed";

const VERSIONS = { appVersion: APP_VERSION, protocolVersion: PROTOCOL_VERSION };

export interface DiagnosticsDialogProps {
  open: boolean;
  onClose: () => void;
  handle: RoomSessionHandle;
  /** Preview only: act out connection problems. `isHost` picks the ones that apply. */
  simulation?: { isHost: boolean; onSimulate: (scenario: SimulatedScenario) => void };
}

/**
 * Connection details for support (PRD FR-053). The copied text describes the connection only:
 * no room ID, Epic, stories, names, votes, links or keys.
 */
export function DiagnosticsDialog({ open, onClose, handle, simulation }: DiagnosticsDialogProps) {
  const diagnostics = useConnectionDiagnostics(handle);
  const [copy, setCopy] = useState<{ status: CopyStatus; text: string }>({
    status: "idle",
    text: "",
  });

  async function copyDiagnostics() {
    const text = formatDiagnostics(diagnostics, {
      ...VERSIONS,
      userAgent: navigator.userAgent,
      at: Date.now(),
    });
    try {
      await navigator.clipboard.writeText(text);
      setCopy({ status: "copied", text });
    } catch {
      setCopy({ status: "failed", text });
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        setCopy({ status: "idle", text: "" });
        onClose();
      }}
      title="Connection details"
      description="If the room won't connect, send these details to whoever supports your team. They contain no room content, names, votes or links."
    >
      <dl className="mt-6 divide-y divide-line rounded-xl border border-line text-sm">
        {describeDiagnostics(diagnostics, VERSIONS).map(({ label, value }) => (
          <div key={label} className="flex items-baseline justify-between gap-4 px-4 py-2.5">
            <dt className="text-ink-muted">{label}</dt>
            <dd className="text-right font-medium break-all text-ink">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex flex-col gap-2">
        <Button
          variant="secondary"
          onClick={copyDiagnostics}
          className={copy.status === "copied" ? "self-start text-success" : "self-start"}
        >
          {copy.status === "copied" ? (
            <Check aria-hidden className="size-4" />
          ) : (
            <Copy aria-hidden className="size-4" />
          )}
          {copy.status === "copied" ? "Copied" : "Copy diagnostics"}
        </Button>
        {copy.status === "failed" ? (
          <>
            <p className="text-xs text-danger">
              Couldn&apos;t copy automatically. Select the text below and copy it.
            </p>
            <textarea
              readOnly
              aria-label="Diagnostics"
              value={copy.text}
              rows={6}
              onFocus={(event) => event.currentTarget.select()}
              className="rounded-md border border-line-strong bg-surface p-2 font-mono text-xs"
            />
          </>
        ) : null}
        <span role="status" className="sr-only">
          {copy.status === "copied" ? "Diagnostics copied to clipboard" : ""}
        </span>
      </div>

      {simulation ? (
        <PreviewControls
          isHost={simulation.isHost}
          onSimulate={(scenario) => {
            onClose();
            simulation.onSimulate(scenario);
          }}
        />
      ) : null}
    </Dialog>
  );
}
