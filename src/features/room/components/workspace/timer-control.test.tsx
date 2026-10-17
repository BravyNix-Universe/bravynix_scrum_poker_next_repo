import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TimerControl } from "./timer-control";

function renderTimer(props: Partial<Parameters<typeof TimerControl>[0]> = {}) {
  const onStart = vi.fn();
  const onStop = vi.fn();
  render(<TimerControl timer={null} canHost onStart={onStart} onStop={onStop} {...props} />);
  return { onStart, onStop, user: userEvent.setup() };
}

describe("TimerControl (PRD 12.5)", () => {
  it("starts a preset", async () => {
    const { onStart, user } = renderTimer();

    await user.click(screen.getByRole("button", { name: "Timer" }));
    await user.click(screen.getByRole("button", { name: "3 min" }));
    await user.click(screen.getByRole("button", { name: "Start 3 min" }));

    expect(onStart).toHaveBeenCalledWith(180_000);
  });

  it("steps a custom duration by 30 seconds, down to 30 seconds", async () => {
    const { onStart, user } = renderTimer();

    await user.click(screen.getByRole("button", { name: "Timer" }));
    for (let i = 0; i < 4; i++) {
      await user.click(screen.getByRole("button", { name: "30 seconds less" }));
    }
    expect(screen.getByRole("button", { name: "30 seconds less" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Start 30 s" }));

    expect(onStart).toHaveBeenCalledWith(30_000);
  });

  it("restarts or stops a running timer", async () => {
    const timer = { durationMs: 120_000, endsAt: Date.now() + 90_000 };
    const { onStart, onStop, user } = renderTimer({ timer });

    await user.click(screen.getByRole("button", { name: /Timer, 01:(29|30) left/ }));
    await user.click(screen.getByRole("button", { name: "Restart" }));
    expect(onStart).toHaveBeenCalledWith(120_000);

    await user.click(screen.getByRole("button", { name: /Timer,/ }));
    await user.click(screen.getByRole("button", { name: "Stop" }));
    expect(onStop).toHaveBeenCalledOnce();
  });

  it("shows participants nothing until the host starts it, then a read-only countdown", async () => {
    const { rerender } = render(
      <TimerControl timer={null} canHost={false} onStart={vi.fn()} onStop={vi.fn()} />,
    );
    expect(screen.queryByText(/Timer/)).not.toBeInTheDocument();

    rerender(
      <TimerControl
        timer={{ durationMs: 60_000, endsAt: Date.now() + 45_000 }}
        canHost={false}
        onStart={vi.fn()}
        onStop={vi.fn()}
      />,
    );
    expect(await screen.findByText(/Timer, 00:4[45] left/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("says time is up at zero, visually and to screen readers, without revealing", () => {
    renderTimer({ timer: { durationMs: 60_000, endsAt: Date.now() - 1_000 }, canHost: false });

    expect(screen.getByText("Time's up")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Time's up. Voting continues until the host reveals.",
    );
  });
});
