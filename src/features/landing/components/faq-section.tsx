import { ChevronDown } from "lucide-react";

import { Container } from "@/components/layout/container";

import { FAQ } from "../content";

export function FaqSection() {
  return (
    <section aria-labelledby="faq-title" className="py-16 sm:py-20">
      <Container className="max-w-3xl">
        <h2 id="faq-title" className="font-display text-3xl font-bold text-ink">
          Frequently asked questions
        </h2>
        <div className="mt-8 divide-y divide-line border-y border-line">
          {FAQ.map((item) => (
            <details key={item.question} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-base font-medium text-ink [&::-webkit-details-marker]:hidden">
                {item.question}
                <ChevronDown
                  aria-hidden
                  className="size-5 shrink-0 text-ink-muted transition-transform group-open:rotate-180 motion-reduce:transition-none"
                />
              </summary>
              <p className="pb-5 text-sm text-ink-muted sm:text-base">{item.answer}</p>
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
