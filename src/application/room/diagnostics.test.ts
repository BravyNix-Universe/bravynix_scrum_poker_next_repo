import { describe, expect, it } from "vitest";

import { describeDiagnostics, formatDiagnostics } from "./diagnostics";
import type { ConnectionDiagnostics } from "../ports/room-session";

const CONTEXT = {
  appVersion: "0.4.0",
  protocolVersion: 1,
  userAgent: "Mozilla/5.0 Test",
  at: Date.UTC(2026, 9, 17, 9, 30),
};

describe("diagnostics (PRD FR-053)", () => {
  it("describes state, path, service reachability, versions and the last error", () => {
    const diagnostics: ConnectionDiagnostics = {
      state: "reconnecting",
      path: "relayed",
      serviceReachable: false,
      lastError: "peer-unavailable",
    };
    expect(describeDiagnostics(diagnostics, CONTEXT)).toEqual([
      { label: "Connection", value: "Reconnecting" },
      { label: "Path", value: "Relayed" },
      { label: "Connection service", value: "Can't be reached" },
      { label: "App version", value: "0.4.0" },
      { label: "Protocol version", value: "1" },
      { label: "Last error", value: "peer-unavailable" },
    ]);
  });

  it("copies plain text with no room details", () => {
    const text = formatDiagnostics(
      { state: "connected", path: "in-tab", serviceReachable: null, lastError: null },
      CONTEXT,
    );
    expect(text).toBe(
      [
        "Bravynix Scrum Poker diagnostics",
        "Connection: Connected",
        "Path: In this tab (preview)",
        "Connection service: Not checked",
        "App version: 0.4.0",
        "Protocol version: 1",
        "Last error: None",
        "Browser: Mozilla/5.0 Test",
        "Time: 2026-10-17T09:30:00.000Z",
      ].join("\n"),
    );
  });
});
