import Link from "next/link";

import { PageShell } from "@/components/layout/page-shell";
import { buttonStyles } from "@/components/ui/button";

export default function NotFound() {
  return (
    <PageShell>
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
        <h1 className="font-display text-3xl font-bold text-primary-strong">
          This page isn&apos;t available
        </h1>
        <p className="mt-3 text-base text-ink-muted">
          Check the link, or start a new room from the home page.
        </p>
        <Link href="/" className={buttonStyles({ className: "mt-8" })}>
          Create a room
        </Link>
      </div>
    </PageShell>
  );
}
