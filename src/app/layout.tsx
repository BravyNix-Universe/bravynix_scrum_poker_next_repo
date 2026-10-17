import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/noto-sans";
import "./globals.css";

import type { Metadata, Viewport } from "next";

import { SkipLink } from "@/components/layout/skip-link";
import { SITE } from "@/config/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.shortName} | ${SITE.brand}`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  referrer: "no-referrer",
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: `${SITE.shortName} | ${SITE.brand}`,
    description: SITE.description,
    url: SITE.url,
  },
};

export const viewport: Viewport = {
  themeColor: "#fbf8ff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col">
        <SkipLink />
        {children}
      </body>
    </html>
  );
}
