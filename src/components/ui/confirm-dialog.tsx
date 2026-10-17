"use client";

import type { ReactNode } from "react";

import { Button, type ButtonVariant } from "./button";
import { Dialog } from "./dialog";

export interface ConfirmDialogProps {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  /** Extra content between the description and the buttons. */
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** "danger" for actions that can't be undone. */
  tone?: Extract<ButtonVariant, "primary" | "accent" | "danger">;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Asks before a consequential action. Cancel comes first in reading order on phones. */
export function ConfirmDialog({
  open,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "primary",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onCancel} title={title} description={description}>
      {children}
      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant={tone} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
