"use client";

import { Check } from "lucide-react";

import { Dialog } from "@/components/ui/dialog";
import type { Story } from "@/domain/room/room";

import { StoryTitleForm } from "./story-title-form";

export interface RenameStoryDialogProps {
  story: Story | null;
  onClose: () => void;
  onRename: (title: string) => void;
}

/** Host only. History shows the story's current title (PRD FR-038, D-13). */
export function RenameStoryDialog({ story, onClose, onRename }: RenameStoryDialogProps) {
  return (
    <Dialog
      open={story !== null}
      onClose={onClose}
      title="Rename story"
      description="Everyone sees the new title, in the queue and in History."
    >
      {story ? (
        <StoryTitleForm
          key={story.id}
          autoFocus
          initialTitle={story.title}
          submitLabel="Save"
          submitIcon={<Check aria-hidden className="size-4" />}
          className="mt-6"
          onSubmit={(title) => {
            onRename(title);
            onClose();
          }}
        />
      ) : null}
    </Dialog>
  );
}
