import Link from "next/link";

import { SITE } from "@/config/site";

import { Container } from "./container";
import { Wordmark } from "./wordmark";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line bg-surface">
      <Container className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
          <Wordmark className="text-lg" />
          <p className="text-xs text-ink-muted">
            © {year} {SITE.brand}. {SITE.tagline}
          </p>
        </div>
        <div className="flex items-center gap-6 text-xs text-ink-muted">
          <Link href="/privacy/" className="hover:text-ink hover:underline">
            Privacy
          </Link>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-1.5 rounded-full bg-accent-ink" />
            No accounts
          </span>
        </div>
      </Container>
    </footer>
  );
}
