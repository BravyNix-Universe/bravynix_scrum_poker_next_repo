import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

/** Centres page content with the design's 1152px maximum width and responsive gutters. */
export function Container({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", className)} {...props} />;
}
