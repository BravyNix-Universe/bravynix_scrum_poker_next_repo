import type { Metadata } from "next";

import { Container } from "@/components/layout/container";
import { PageShell } from "@/components/layout/page-shell";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How Bravynix Scrum Poker handles room data, IP addresses and deletion.",
};

// Wording agreed in PRD 14.4. To be reviewed against applicable law before public launch.
const SECTIONS = [
  {
    title: "What a room contains",
    body: [
      "A room holds the Epic and story titles, optional display names, avatar choices, votes and timestamps. There are no accounts, and we don't ask for an email address or password.",
    ],
  },
  {
    title: "Where it is stored",
    body: [
      "Room data is stored only in the browsers of the people in the room. The host's browser runs the room, and each participant's browser keeps its own copy.",
      "Every device deletes the room 24 hours after it was created, even if the host ended it earlier. A device that never opens the site again keeps its expired copy until the site is next opened there, and then deletes it before showing anything.",
      "Copies of a browser profile made by device backup tools are outside our control.",
    ],
  },
  {
    title: "IP addresses",
    body: [
      "Browsers in a room connect directly to each other, so the host's browser can see each participant's IP address, and participants can see the host's.",
      "To set up those connections, the PeerJS connection service and public STUN servers process IP addresses. They never receive room content.",
      "Our web host, Hostinger, keeps standard access logs of IP addresses and the pages requested. Room links keep the room ID after the # sign, which browsers never send to a server.",
    ],
  },
  {
    title: "No tracking",
    body: [
      "We use no analytics, advertising or third-party tracking, and the site loads no third-party scripts.",
    ],
  },
] as const;

export default function PrivacyPage() {
  return (
    <PageShell>
      <Container className="max-w-3xl py-12 sm:py-16">
        <h1 className="font-display text-4xl font-bold text-primary-strong">Privacy</h1>
        <p className="mt-6 rounded-xl border border-line bg-surface p-5 text-base text-ink">
          Bravynix stores no room data on its servers. Each room exists only in participants&apos;
          browsers and is deleted 24 hours after it was created: immediately if the site is open,
          otherwise the next time the site is opened on that device.
        </p>
        {SECTIONS.map((section) => (
          <section key={section.title} className="mt-10">
            <h2 className="font-display text-2xl font-semibold text-ink">{section.title}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="mt-3 text-base text-ink-muted">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </Container>
    </PageShell>
  );
}
