import Link from "next/link";

import { SITE } from "@/config/site";
import { cn } from "@/lib/cn";

export function Wordmark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("font-display text-xl font-bold tracking-tight text-primary-strong", className)}
    >
      {SITE.brand}
    </Link>
  );
}
