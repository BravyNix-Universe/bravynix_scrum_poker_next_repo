import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { getMyRoomsRepository } from "@/composition/services";

import { CreateRoomForm } from "./create-room-form";

beforeAll(() => {
  // jsdom doesn't implement the modal methods of <dialog>.
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  });
});

describe("CreateRoomForm", () => {
  it("refuses an empty Epic name with an accessible message (PRD 18.1.2)", async () => {
    const user = userEvent.setup();
    render(<CreateRoomForm />);

    await user.click(screen.getByRole("button", { name: "Create room" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Enter an Epic name");
    expect(screen.getByLabelText("Epic name")).toHaveAttribute("aria-invalid", "true");
  });

  it("refuses a 161-character Epic name", async () => {
    const user = userEvent.setup();
    render(<CreateRoomForm />);

    await user.click(screen.getByLabelText("Epic name"));
    await user.paste("a".repeat(161));
    await user.click(screen.getByRole("button", { name: "Create room" }));

    expect(screen.getByRole("alert")).toHaveTextContent("160 characters or fewer");
  });

  it("creates a room, shows both links and records it in My rooms (PRD 18.1.1)", async () => {
    const user = userEvent.setup();
    render(<CreateRoomForm />);

    await user.type(screen.getByLabelText("Epic name"), "  Checkout revamp ");
    await user.click(screen.getByRole("button", { name: "Create room" }));

    const dialog = await screen.findByRole("dialog", {
      name: "Your room is ready",
    });
    expect(within(dialog).getByText(/Epic: Checkout revamp/)).toBeInTheDocument();
    expect(
      within(dialog).getByTitle(/^localhost(:\d+)?\/r\/#[0-9A-Za-z]{12}$/),
    ).toBeInTheDocument();
    expect(within(dialog).getByTitle(/\/r\/#[0-9A-Za-z]{12}&h=••••.{4}$/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Anyone with this link controls the room/)).toBeInTheDocument();

    expect(getMyRoomsRepository().list(Date.now())).toEqual([
      expect.objectContaining({ epicTitle: "Checkout revamp", role: "host" }),
    ]);
  });
});
