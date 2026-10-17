import { SITE } from "@/config/site";

import { Container } from "./container";
import { Wordmark } from "./wordmark";
import { Badge } from "../ui/badge";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface">
      <Container className="flex h-16 items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Wordmark />
          <span aria-hidden className="h-4 w-px bg-line" />
          <span className="truncate text-sm text-ink-muted">{SITE.shortName}</span>
        </div>
        <Badge tone="primary" className="hidden sm:inline-flex">
          Free &amp; ephemeral
        </Badge>
      </Container>
    </header>
  );
}
