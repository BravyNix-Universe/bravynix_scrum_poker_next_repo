import type { Metadata } from "next";

import { RoomScreen } from "@/features/room/room-screen";

export const metadata: Metadata = {
  title: "Room",
  robots: { index: false, follow: false },
};

export default function RoomPage() {
  return <RoomScreen />;
}
