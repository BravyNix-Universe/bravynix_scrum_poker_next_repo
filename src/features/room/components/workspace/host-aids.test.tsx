import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { HostAids } from "./host-aids";

function setHidden(hidden: boolean) {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => (hidden ? "hidden" : "visible"),
  });
  act(() => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
}

afterEach(() => setHidden(false));

describe("HostAids (PRD FR-054)", () => {
  it("flags a hidden hosting tab in its title, then explains when the host returns", async () => {
    document.title = "Room | Bravynix Scrum Poker";
    render(<HostAids hosting onlineCount={4} />);
    expect(screen.queryByText(/This tab was in the background/)).not.toBeInTheDocument();

    setHidden(true);
    expect(document.title).toMatch(/^Keep this tab open: you're hosting/);

    setHidden(false);
    expect(document.title).toBe("Room | Bravynix Scrum Poker");
    expect(screen.getByText(/This tab was in the background/)).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText(/This tab was in the background/)).not.toBeInTheDocument();
  });

  it("does nothing for participants", () => {
    document.title = "Room";
    render(<HostAids hosting={false} onlineCount={30} />);
    setHidden(true);
    expect(document.title).toBe("Room");
  });
});
