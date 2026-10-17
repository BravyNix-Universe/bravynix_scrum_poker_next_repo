"use client";

import { useState } from "react";

import { canSimulate } from "@/application/ports/room-session-simulation";
import type { ConnectionStatus, RoomNotice } from "@/application/room/room-session-state";
import type { RoomView } from "@/application/room/room-view";
import { Container } from "@/components/layout/container";
import { SiteFooter } from "@/components/layout/site-footer";
import { MAIN_CONTENT_ID } from "@/components/layout/skip-link";
import { IS_PREVIEW_SESSION } from "@/composition/services";
import { getRoomPhase, type Round, type StoryId, visibleStories } from "@/domain/room/room";
import { cn } from "@/lib/cn";

import { AddStoryDialog } from "./add-story-dialog";
import { CardDeck, type DeckMode } from "./card-deck";
import { EmptyRoom } from "./empty-room";
import { EndedBanner } from "./ended-banner";
import { HistorySheet } from "./history-sheet";
import { HostAids } from "./host-aids";
import { PreviewBanner } from "./preview-banner";
import { RefusalToast } from "./refusal-toast";
import { RenameStoryDialog } from "./rename-story-dialog";
import { ResultsPanel } from "./results-panel";
import { RoomAnnouncer } from "./room-announcer";
import { RoomConfirmDialog } from "./room-confirm-dialog";
import { RoomNotices } from "./room-notices";
import { RoomToolbar } from "./room-toolbar";
import { RoomTopBar } from "./room-top-bar";
import { Roster } from "./roster";
import { StoriesSheet } from "./stories-sheet";
import { StoryPanel } from "./story-panel";
import { useRoomActions } from "../../use-room-actions";
import type { RoomSessionHandle } from "../../use-room-session";
import { ConnectionBanner } from "../connection/connection-banner";
import { DiagnosticsDialog } from "../connection/diagnostics-dialog";
import { ProfileDialog } from "../profile/profile-dialog";

export interface RoomWorkspaceProps {
  view: RoomView;
  connection: ConnectionStatus;
  /** The latest refused action, if any (PRD 8.7). */
  notice: RoomNotice | null;
  handle: RoomSessionHandle;
}

type Overlay =
  | { kind: "stories" }
  | { kind: "history" }
  | { kind: "add-story" }
  | { kind: "rename-story"; storyId: StoryId }
  | { kind: "profile" }
  | { kind: "diagnostics" };

/**
 * The room once joined (PRD 8.3, 8.4). On phones the deck comes straight after the story so
 * voting stays within reach; on wider screens, and whenever votes are revealed, it sits below
 * the roster. An ended room is read-only: no deck and no host actions (FR-022).
 */
export function RoomWorkspace({ view, connection, notice, handle }: RoomWorkspaceProps) {
  const actions = useRoomActions(view, handle);
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const close = () => setOverlay(null);

  const me = view.participants.find((person) => person.id === view.me);
  if (!me) return null;

  const ended = view.status === "ended";
  const canHost = me.isHost && !ended;
  const activeStory = view.stories.find((story) => story.id === view.activeStoryId) ?? null;
  const phase = getRoomPhase(activeStory, view.round);
  const revealed = phase === "review" && view.round?.outcome ? view.round : null;
  const renaming =
    overlay?.kind === "rename-story"
      ? (view.stories.find((story) => story.id === overlay.storyId) ?? null)
      : null;
  const onlineCount = view.participants.filter((person) => person.online).length;

  return (
    <>
      <RoomTopBar
        view={view}
        me={me}
        connection={connection}
        isPreview={IS_PREVIEW_SESSION}
        canHost={canHost}
        onStartTimer={actions.startTimer}
        onStopTimer={actions.stopTimer}
        onChangeProfile={() => setOverlay({ kind: "profile" })}
        onShowDiagnostics={() => setOverlay({ kind: "diagnostics" })}
        onEndRoom={actions.endRoom}
        onForgetRoom={actions.forgetRoom}
      />
      <RoomNotices>
        {IS_PREVIEW_SESSION ? <PreviewBanner /> : null}
        {ended ? <EndedBanner expiresAt={view.expiresAt} /> : null}
        {connection !== "connected" && !ended ? <ConnectionBanner connection={connection} /> : null}
        {canHost ? <HostAids hosting={canHost} onlineCount={onlineCount} /> : null}
      </RoomNotices>

      <main id={MAIN_CONTENT_ID} className="flex-1">
        <Container className="flex flex-col gap-6 py-6 sm:gap-8 sm:py-8">
          <RoomToolbar
            view={view}
            onOpenStories={() => setOverlay({ kind: "stories" })}
            onOpenHistory={() => setOverlay({ kind: "history" })}
          />
          {activeStory ? (
            <>
              <StoryPanel
                story={activeStory}
                stories={view.stories}
                round={view.round}
                phase={phase}
                canHost={canHost}
                ended={ended}
                myVote={view.myVote}
                onAddStory={() => setOverlay({ kind: "add-story" })}
                onRenameStory={() => setOverlay({ kind: "rename-story", storyId: activeStory.id })}
                onActivateStory={actions.activateStory}
                onStartRound={actions.startRound}
                onReveal={actions.reveal}
              />
              {revealed?.outcome ? (
                <ResultsPanel outcome={revealed.outcome} roundNumber={revealed.number} />
              ) : null}
              {ended ? null : (
                <CardDeck
                  mode={deckModeOf(view.round, connection)}
                  selected={view.myVote}
                  onSelect={actions.castVote}
                  className={cn(revealed ? "order-last" : "lg:order-last")}
                />
              )}
            </>
          ) : (
            <EmptyRoom
              canHost={canHost}
              ended={ended}
              hasStories={visibleStories(view.stories).length > 0}
              onAddStory={actions.addStory}
              onOpenStories={() => setOverlay({ kind: "stories" })}
            />
          )}
          <Roster
            participants={view.participants}
            me={view.me}
            phase={phase}
            round={view.round}
            hostAway={connection === "host-away"}
          />
        </Container>
      </main>

      <SiteFooter />
      <RoomAnnouncer view={view} connection={connection} />
      <RefusalToast notice={notice} />

      <StoriesSheet
        open={overlay?.kind === "stories"}
        onClose={close}
        view={view}
        canHost={canHost}
        onAddStory={actions.addStory}
        onActivateStory={actions.activateStory}
        onRenameStory={(storyId) => setOverlay({ kind: "rename-story", storyId })}
        onMoveStory={actions.moveStory}
        onRemoveStory={actions.removeStory}
        onRestoreStory={actions.restoreStory}
        onDeleteStory={actions.deleteStory}
      />
      <HistorySheet open={overlay?.kind === "history"} onClose={close} view={view} />
      <DiagnosticsDialog
        open={overlay?.kind === "diagnostics"}
        onClose={close}
        handle={handle}
        simulation={
          IS_PREVIEW_SESSION
            ? {
                isHost: me.isHost,
                onSimulate: (scenario) => {
                  const session = handle.current();
                  if (session && canSimulate(session)) session.simulate(scenario);
                },
              }
            : undefined
        }
      />
      <ProfileDialog
        open={overlay?.kind === "profile"}
        profile={me}
        onClose={close}
        onSave={actions.changeProfile}
      />
      {canHost ? (
        <>
          <AddStoryDialog
            open={overlay?.kind === "add-story"}
            onClose={close}
            onAdd={actions.addStory}
          />
          <RenameStoryDialog
            story={renaming}
            onClose={close}
            onRename={(title) => renaming && actions.renameStory(renaming.id, title)}
          />
        </>
      ) : null}
      <RoomConfirmDialog
        view={view}
        pending={actions.pending}
        onConfirm={actions.confirmPending}
        onCancel={actions.cancelPending}
      />
    </>
  );
}

function deckModeOf(round: Round | null, connection: ConnectionStatus): DeckMode {
  if (connection === "reconnecting") return "reconnecting";
  if (connection === "host-away") return "paused";
  switch (round?.status) {
    case "voting":
      return "open";
    case "revealing":
      return "revealing";
    case "revealed":
      return "closed";
    default:
      return "locked";
  }
}
