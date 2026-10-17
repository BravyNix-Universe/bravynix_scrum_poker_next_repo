import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";

import type { RoomState } from "@/application/referee/room-state";
import type { ConnectionStatus, RoomNotice } from "@/application/room/room-session-state";
import { toRoomView } from "@/application/room/room-view";
import type { ParticipantId, StoryId } from "@/domain/room/room";
import { createFakeRoomSession, FAKE_DIAGNOSTICS } from "@/test/fakes/fake-room-session";
import { buildRoom, joinAs, type RoomStep } from "@/test/fakes/room-builder";

import { RoomWorkspace } from "./room-workspace";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const SEAL = "c2VhbGVk";
const HOST = "host" as ParticipantId;
const ARJUN = "arjun" as ParticipantId;
const MEERA = "meera" as ParticipantId;

beforeAll(() => {
  // jsdom doesn't implement the modal methods of <dialog>.
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  });
});

/** Host Priya, Arjun and Meera; two stories, the first active and voting; Arjun has voted. */
const VOTING: readonly RoomStep[] = [
  [HOST, joinAs("Priya", true)],
  [ARJUN, joinAs("Arjun")],
  [MEERA, joinAs("Meera")],
  [HOST, { type: "add-story", title: "Saved cards" }],
  [HOST, { type: "add-story", title: "Guest checkout" }],
  [HOST, { type: "start-round" }],
  [ARJUN, { type: "cast-vote", seal: SEAL }],
];

const REVEALED: readonly RoomStep[] = [
  ...VOTING,
  [MEERA, { type: "cast-vote", seal: SEAL }],
  [HOST, { type: "reveal" }],
  [ARJUN, { type: "open-vote", card: "3", fingerprint: SEAL }],
  [MEERA, { type: "open-vote", card: "8", fingerprint: SEAL }],
  [HOST, { type: "finish-reveal" }],
];

function renderRoom(
  state: RoomState,
  me: ParticipantId,
  {
    connection = "connected",
    notice = null,
  }: { connection?: ConnectionStatus; notice?: RoomNotice | null } = {},
) {
  const session = createFakeRoomSession();
  const view = toRoomView(state, me, null);
  render(
    <RoomWorkspace
      view={view}
      connection={connection}
      notice={notice}
      handle={{
        subscribe: () => () => undefined,
        getState: () => ({ status: "joined", view, connection, notice }),
        getDiagnostics: () => FAKE_DIAGNOSTICS,
        current: () => session,
      }}
    />,
  );
  return { session, user: userEvent.setup() };
}

const menuOf = (name: string) => new RegExp(`^${name}.*profile and room options$`);

describe("RoomWorkspace", () => {
  it("asks before revealing early and names who hasn't voted (PRD A-01)", async () => {
    const { session, user } = renderRoom(buildRoom(VOTING), HOST);

    await user.click(screen.getByRole("button", { name: "Reveal votes" }));

    const dialog = screen.getByRole("dialog", { name: "Reveal votes now?" });
    expect(dialog).toHaveTextContent("1 person hasn't voted yet: Meera");
    expect(session.reveal).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "Reveal votes" }));
    expect(session.reveal).toHaveBeenCalledOnce();
  });

  it("asks before switching story mid-vote, from the stories panel (FR-041)", async () => {
    const { session, user } = renderRoom(buildRoom(VOTING), HOST);

    await user.click(screen.getByRole("button", { name: /Stories/ }));
    const panel = screen.getByRole("dialog", { name: "Stories" });
    const second = within(panel).getByText("Guest checkout").closest("li")!;
    await user.click(within(second).getByRole("button", { name: "Show story actions" }));
    await user.click(within(second).getByRole("button", { name: "Make active" }));

    const dialog = screen.getByRole("dialog", { name: "Switch story and cancel this round?" });
    await user.click(within(dialog).getByRole("button", { name: "Switch story" }));
    expect(session.activateStory).toHaveBeenCalledWith("id2" as StoryId);
  });

  it("shows the result after reveal and closes the deck (PRD 8.5)", () => {
    renderRoom(buildRoom(REVEALED), ARJUN);

    const results = screen.getByRole("region", { name: "Results of round 1" });
    expect(within(results).getByText("5.5")).toBeInTheDocument();
    expect(within(results).getByText("From 2 numeric votes")).toBeInTheDocument();
    expect(screen.getByText("Voting is closed for this round.")).toBeInTheDocument();
    for (const card of screen.getAllByRole("radio")) expect(card).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Start new round" })).not.toBeInTheDocument();
  });

  it("lists the revealed round in History with its votes (FR-020)", async () => {
    const { user } = renderRoom(buildRoom(REVEALED), MEERA);

    await user.click(screen.getByRole("button", { name: /History/ }));
    const history = screen.getByRole("dialog", { name: "History" });
    expect(within(history).getByText("Saved cards")).toBeInTheDocument();
    expect(within(history).getByText("Average 5.5")).toBeInTheDocument();
    expect(within(history).getByText("voted 8")).toBeInTheDocument();
  });

  it("lets the host end the room after confirming (FR-022)", async () => {
    const { session, user } = renderRoom(buildRoom(VOTING), HOST);

    await user.click(screen.getByRole("button", { name: menuOf("Priya") }));
    await user.click(screen.getByRole("button", { name: "End room" }));
    const dialog = screen.getByRole("dialog", { name: "End this room?" });
    expect(dialog).toHaveTextContent("the open round is cancelled");

    await user.click(within(dialog).getByRole("button", { name: "End room" }));
    expect(session.endRoom).toHaveBeenCalledOnce();
  });

  it("shows an ended room read-only: no deck, timer or host actions (FR-022)", async () => {
    const { user } = renderRoom(buildRoom([...REVEALED, [HOST, { type: "end-room" }]]), HOST);

    expect(screen.getByText("This room has ended.")).toBeInTheDocument();
    expect(screen.getByText("These results are final: the room has ended.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Your card" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Timer/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start new round" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Rename" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: menuOf("Priya") }));
    expect(screen.queryByRole("button", { name: "End room" })).not.toBeInTheDocument();
  });

  it("changes name and avatar from the room menu (FR-049)", async () => {
    const { session, user } = renderRoom(buildRoom(VOTING), MEERA);

    await user.click(screen.getByRole("button", { name: menuOf("Meera") }));
    await user.click(screen.getByRole("button", { name: "Change name and avatar" }));
    const dialog = screen.getByRole("dialog", { name: "Your name and avatar" });
    const name = within(dialog).getByLabelText("Your name (optional)");
    await user.clear(name);
    await user.type(name, "Meera K");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(session.updateProfile).toHaveBeenCalledWith({ displayName: "Meera K", avatarId: null });
  });

  it("disables the deck while reconnecting and says the vote isn't recorded (FR-057)", () => {
    renderRoom(buildRoom(VOTING), MEERA, { connection: "reconnecting" });

    expect(screen.getByText(/Connection lost\./)).toBeInTheDocument();
    expect(screen.getByText("Reconnecting: your vote isn't recorded yet.")).toBeInTheDocument();
    for (const card of screen.getAllByRole("radio")) expect(card).toBeDisabled();
  });

  it("pauses voting while the host is away, keeping history readable (FR-047)", async () => {
    const { user } = renderRoom(buildRoom(REVEALED), MEERA, { connection: "host-away" });

    expect(screen.getByText(/Waiting for the host\./)).toBeInTheDocument();
    const roster = screen.getByRole("region", { name: "People here (2)" });
    expect(within(roster).getByText("Priya").closest("li")).toHaveTextContent("Away");
    await user.click(screen.getByRole("button", { name: /History/ }));
    expect(screen.getByRole("dialog", { name: "History" })).toHaveTextContent("Saved cards");
  });

  it("says why an action was refused (PRD 8.7, FR-056)", async () => {
    const { user } = renderRoom(buildRoom(VOTING), MEERA, {
      notice: { id: 1, refusal: "round-closed" },
    });

    expect(screen.getByRole("alert")).toHaveTextContent("Voting for this round has closed.");
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows connection details from the room menu, without room content (FR-053)", async () => {
    const { user } = renderRoom(buildRoom(VOTING), MEERA);

    await user.click(screen.getByRole("button", { name: menuOf("Meera") }));
    await user.click(screen.getByRole("button", { name: "Connection details" }));

    const dialog = screen.getByRole("dialog", { name: "Connection details" });
    expect(dialog).toHaveTextContent("ConnectionConnected");
    expect(dialog).toHaveTextContent("Protocol version1");
    expect(within(dialog).getByRole("button", { name: "Copy diagnostics" })).toBeInTheDocument();
  });
});
