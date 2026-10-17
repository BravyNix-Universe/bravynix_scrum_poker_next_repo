"use client";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { MyRoomEntry } from "@/domain/my-rooms/my-room-entry";

export interface DeleteRoomDialogProps {
  room: MyRoomEntry | null;
  onCancel: () => void;
  onConfirm: (room: MyRoomEntry) => void;
}

export function DeleteRoomDialog({ room, onCancel, onConfirm }: DeleteRoomDialogProps) {
  return (
    <ConfirmDialog
      open={room !== null}
      title="Delete from this device?"
      description={
        room?.role === "host"
          ? `“${room.epicTitle}” will be removed from this device. You'll only be able to host it again with its host link.`
          : `“${room?.epicTitle ?? ""}” will be removed from this device. You can rejoin while the room is open.`
      }
      cancelLabel="Keep it"
      confirmLabel="Delete from this device"
      onCancel={onCancel}
      onConfirm={() => room && onConfirm(room)}
    />
  );
}
