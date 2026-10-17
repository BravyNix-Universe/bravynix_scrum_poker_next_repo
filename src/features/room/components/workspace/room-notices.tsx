import { Children, type ReactNode } from "react";

/**
 * The strip of banners under the top bar (preview, ended, connection, host aids), grouped in a
 * labelled region so all page content sits in a landmark (WCAG 1.3.1).
 */
export function RoomNotices({ children }: { children: ReactNode }) {
  if (Children.toArray(children).length === 0) return null;
  return <section aria-label="Room notices">{children}</section>;
}
