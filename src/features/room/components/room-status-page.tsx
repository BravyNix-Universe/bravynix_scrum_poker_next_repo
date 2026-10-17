"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useRef } from "react";

import { buttonStyles } from "@/components/ui/button";

export interface RoomStatusPageProps {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  /** Buttons for what the person can do next. */
  actions?: ReactNode;
  /** Show a link back to the landing page. */
  homeLink?: boolean;
  /**
   * Move focus to the title when the page appears, so screen readers read it. Use it when this
   * page replaces the room the person was in.
   */
  focusTitle?: boolean;
}

/** A centred message for room states that have nothing else to show. */
export function RoomStatusPage({
  icon,
  title,
  children,
  actions,
  homeLink = false,
  focusTitle = false,
}: RoomStatusPageProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (focusTitle) titleRef.current?.focus();
  }, [focusTitle]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-16 text-center sm:py-24">
      {icon}
      <h1
        ref={titleRef}
        tabIndex={focusTitle ? -1 : undefined}
        className="mt-4 font-display text-2xl font-bold text-balance text-primary-strong outline-none sm:text-3xl"
      >
        {title}
      </h1>
      {children ? (
        <div className="mt-3 flex flex-col gap-2 text-base text-ink-muted">{children}</div>
      ) : null}
      {actions || homeLink ? (
        <div className="mt-8 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row sm:justify-center">
          {actions}
          {homeLink ? (
            <Link
              href="/"
              className={buttonStyles({
                variant: actions ? "ghost" : "secondary",
                className: "max-sm:w-full",
              })}
            >
              Return to Bravynix home
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
