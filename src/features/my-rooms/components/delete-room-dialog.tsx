"use client";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { MyRoomEntry } from "@/domain/my-rooms/my-room-entry";

export interface DeleteRoomDialogProps {
  room: MyRoomEntry | null;
  onCancel: () => void;
  onConfirm: (room: MyRoomEntry) => void;
}

export function DeleteRoomDialog({ room, onCancel, onConfirm }: DeleteRoomDialogProps) {
  return (
    <Dialog
      open={room !== null}
      onClose={onCancel}
      title="Delete from this device?"
      description={
        room?.role === "host"
          ? `“${room.epicTitle}” will be removed from this device. You'll only be able to host it again with its host link.`
          : `“${room?.epicTitle ?? ""}” will be removed from this device. You can rejoin while the room is open.`
      }
    >
      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel}>
          Keep it
        </Button>
        <Button onClick={() => room && onConfirm(room)}>Delete from this device</Button>
      </div>
    </Dialog>
  );
}
