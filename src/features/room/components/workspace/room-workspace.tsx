"use client";

import { useState } from "react";

import type { RoomView } from "@/application/room/room-view";
import { Container } from "@/components/layout/container";
import { SiteFooter } from "@/components/layout/site-footer";
import { MAIN_CONTENT_ID } from "@/components/layout/skip-link";
import { IS_PREVIEW_SESSION } from "@/composition/services";
import { getRoomPhase } from "@/domain/room/room";

import { AddStoryDialog } from "./add-story-dialog";
import { CardDeck } from "./card-deck";
import { EmptyRoom } from "./empty-room";
import { PreviewBanner } from "./preview-banner";
import { RoomTopBar } from "./room-top-bar";
import { Roster } from "./roster";
import { StoryPanel } from "./story-panel";
import type { RoomSessionHandle } from "../../use-room-session";

export interface RoomWorkspaceProps {
  view: RoomView;
  handle: RoomSessionHandle;
}

/**
 * The room once joined (PRD 8.3, 8.4). On phones the deck comes straight after the story so
 * voting stays within reach; on wider screens it sits below the roster, as in the design.
 */
export function RoomWorkspace({ view, handle }: RoomWorkspaceProps) {
  const [addingStory, setAddingStory] = useState(false);
  const me = view.participants.find((person) => person.id === view.me);
  const activeStory = view.stories.find((story) => story.id === view.activeStoryId) ?? null;
  const phase = getRoomPhase(activeStory, view.round);
  const session = () => handle.current();

  if (!me) return null;

  return (
    <>
      <RoomTopBar view={view} me={me} isPreview={IS_PREVIEW_SESSION} />
      {IS_PREVIEW_SESSION ? <PreviewBanner /> : null}

      <main id={MAIN_CONTENT_ID} className="flex-1">
        <Container className="flex flex-col gap-6 py-6 sm:gap-8 sm:py-8">
          {activeStory ? (
            <>
              <StoryPanel
                story={activeStory}
                stories={view.stories}
                round={view.round}
                phase={phase}
                isHost={me.isHost}
                myVote={view.myVote}
                onAddStory={() => setAddingStory(true)}
                onActivateStory={(storyId) => session()?.activateStory(storyId)}
                onStartEstimation={() => session()?.startEstimation()}
              />
              <CardDeck
                enabled={phase === "estimate" && view.round?.status === "voting"}
                selected={view.myVote}
                onSelect={(card) => session()?.castVote(card)}
                className="lg:order-last"
              />
            </>
          ) : (
            <EmptyRoom
              isHost={me.isHost}
              hasStories={view.stories.length > 0}
              onAddStory={(title) => session()?.addStory(title)}
            />
          )}
          <Roster participants={view.participants} me={view.me} phase={phase} round={view.round} />
        </Container>
      </main>

      <SiteFooter />

      {me.isHost ? (
        <AddStoryDialog
          open={addingStory}
          onClose={() => setAddingStory(false)}
          onAdd={(title) => session()?.addStory(title)}
        />
      ) : null}
    </>
  );
}
