import { Container } from "@/components/layout/container";
import { CreateRoomForm } from "@/features/create-room/components/create-room-form";

import { HERO } from "../content";
import { RoomPreview } from "./room-preview";

export function HeroSection() {
  return (
    <section aria-labelledby="hero-title" className="pt-10 pb-12 sm:pt-16 sm:pb-16">
      <Container className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
        <div>
          <h1
            id="hero-title"
            className="font-display text-4xl leading-tight font-bold tracking-tight text-balance text-primary-strong sm:text-5xl lg:text-[56px] lg:leading-[60px]"
          >
            {HERO.title}
          </h1>
          <p className="mt-4 max-w-md text-base text-pretty text-ink-muted">{HERO.lead}</p>
          <CreateRoomForm note={HERO.formNote} className="mt-8 max-w-md" />
        </div>
        <RoomPreview />
      </Container>
    </section>
  );
}
