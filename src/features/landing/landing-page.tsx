import { PageShell } from "@/components/layout/page-shell";
import { MyRoomsSection } from "@/features/my-rooms/components/my-rooms-section";

import { FaqSection } from "./components/faq-section";
import { HeroSection } from "./components/hero-section";
import { HowItWorks } from "./components/how-it-works";
import { TrustStrip } from "./components/trust-strip";

export function LandingPage() {
  return (
    <PageShell>
      <HeroSection />
      <MyRoomsSection />
      <HowItWorks />
      <TrustStrip />
      <FaqSection />
    </PageShell>
  );
}
