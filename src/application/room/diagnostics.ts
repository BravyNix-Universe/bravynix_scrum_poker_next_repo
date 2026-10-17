import type { ConnectionDiagnostics } from "../ports/room-session";

export interface DiagnosticsContext {
  appVersion: string;
  protocolVersion: number;
  userAgent: string;
  /** When the report was made, in milliseconds. */
  at: number;
}

const STATE_LABELS: Record<ConnectionDiagnostics["state"], string> = {
  connecting: "Connecting",
  "waiting-for-host": "Waiting for the host",
  connected: "Connected",
  reconnecting: "Reconnecting",
  "host-away": "Host away",
  failed: "Not connected",
};

const PATH_LABELS: Record<NonNullable<ConnectionDiagnostics["path"]>, string> = {
  direct: "Direct",
  relayed: "Relayed",
  "in-tab": "In this tab (preview)",
};

export interface DiagnosticsRow {
  label: string;
  value: string;
}

/** The rows of the diagnostics panel (PRD FR-053), in display order. */
export function describeDiagnostics(
  diagnostics: ConnectionDiagnostics,
  context: Pick<DiagnosticsContext, "appVersion" | "protocolVersion">,
): DiagnosticsRow[] {
  return [
    { label: "Connection", value: STATE_LABELS[diagnostics.state] },
    { label: "Path", value: diagnostics.path ? PATH_LABELS[diagnostics.path] : "Not connected" },
    {
      label: "Connection service",
      value:
        diagnostics.serviceReachable === null
          ? "Not checked"
          : diagnostics.serviceReachable
            ? "Reachable"
            : "Can't be reached",
    },
    { label: "App version", value: context.appVersion },
    { label: "Protocol version", value: String(context.protocolVersion) },
    { label: "Last error", value: diagnostics.lastError ?? "None" },
  ];
}

/**
 * The "Copy diagnostics" text, for someone to send to support. It describes the connection
 * only: no room ID, Epic, stories, names, votes, links or keys (PRD FR-053).
 */
export function formatDiagnostics(
  diagnostics: ConnectionDiagnostics,
  context: DiagnosticsContext,
): string {
  const rows = describeDiagnostics(diagnostics, context).map(
    ({ label, value }) => `${label}: ${value}`,
  );
  return [
    "Bravynix Scrum Poker diagnostics",
    ...rows,
    `Browser: ${context.userAgent}`,
    `Time: ${new Date(context.at).toISOString()}`,
  ].join("\n");
}
