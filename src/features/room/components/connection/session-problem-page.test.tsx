import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { SessionProblem } from "@/application/room/room-session-state";
import { createFakeRoomSession, FAKE_DIAGNOSTICS } from "@/test/fakes/fake-room-session";

import { SessionProblemPage } from "./session-problem-page";

function renderProblem(problem: SessionProblem) {
  const session = createFakeRoomSession({ status: "failed", problem });
  render(
    <SessionProblemPage
      problem={problem}
      handle={{
        subscribe: () => () => undefined,
        getState: session.getState,
        getDiagnostics: () => FAKE_DIAGNOSTICS,
        current: () => session,
      }}
    />,
  );
  return { session, user: userEvent.setup() };
}

describe("SessionProblemPage (PRD 8.5, 16)", () => {
  it("names a blocked network separately and suggests another one", async () => {
    const { session, user } = renderProblem("host-unreachable");

    const title = screen.getByRole("heading", {
      name: "Can't connect to the host from this network",
    });
    expect(title).toHaveFocus();
    expect(screen.getByText(/such as a phone hotspot/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(session.retry).toHaveBeenCalledOnce();
  });

  it("uses the PRD wording for a full room", () => {
    renderProblem("room-full");
    expect(screen.getByRole("heading", { name: "This room is full (50 people)" })).toBeVisible();
  });

  it("asks an outdated app to refresh instead of retrying (FR-052)", () => {
    renderProblem("outdated-app");
    expect(
      screen.getByRole("heading", { name: "A newer version of Bravynix is available" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/^Please refresh\./)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });
});
