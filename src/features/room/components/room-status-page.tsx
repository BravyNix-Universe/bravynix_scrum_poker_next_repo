import Link from "next/link";
import type { ReactNode } from "react";

import { buttonStyles } from "@/components/ui/button";

export interface RoomStatusPageProps {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  /** Show a link back to the landing page. */
  homeLink?: boolean;
}

/** A centred message for room states that have nothing else to show. */
export function RoomStatusPage({ icon, title, children, homeLink = false }: RoomStatusPageProps) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      {icon}
      <h1 className="mt-4 font-display text-3xl font-bold text-primary-strong">{title}</h1>
      {children ? <div className="mt-3 text-base text-ink-muted">{children}</div> : null}
      {homeLink ? (
        <Link href="/" className={buttonStyles({ variant: "secondary", className: "mt-8" })}>
          Return to Bravynix home
        </Link>
      ) : null}
    </div>
  );
}
