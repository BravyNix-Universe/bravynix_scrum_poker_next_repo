import { FlaskConical } from "lucide-react";

import { Container } from "@/components/layout/container";

/** Says plainly that teammates are simulated when rooms run on the preview session. */
export function PreviewBanner() {
  return (
    <div className="border-b border-accent/40 bg-accent-soft">
      <Container className="flex items-start gap-2 py-2 text-xs text-accent-ink sm:items-center">
        <FlaskConical aria-hidden className="mt-0.5 size-3.5 shrink-0 sm:mt-0" />
        <p>
          <strong className="font-semibold">Preview:</strong> teammates are simulated and nothing
          leaves this tab.
        </p>
      </Container>
    </div>
  );
}
