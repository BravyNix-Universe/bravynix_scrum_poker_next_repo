"use client";

import { Dialog } from "@/components/ui/dialog";

import { StoryTitleForm } from "./story-title-form";

export interface AddStoryDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (title: string) => void;
}

/** Host only: add a story to the end of the queue (PRD FR-008). */
export function AddStoryDialog({ open, onClose, onAdd }: AddStoryDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add a story"
      description="It joins the end of the queue. You can add stories before or during the meeting."
    >
      {open ? (
        <StoryTitleForm
          autoFocus
          className="mt-6"
          onSubmit={(title) => {
            onAdd(title);
            onClose();
          }}
        />
      ) : null}
    </Dialog>
  );
}
