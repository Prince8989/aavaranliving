import type { Metadata } from "next";
import { getContent } from "@/lib/content";
import { site } from "@/lib/site";
import { Motif } from "@/components/ui/Motif";
import { Reveal } from "@/components/ui/Reveal";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Our Story",
  description: "AAVARAN takes its name from the Sanskrit आवरण — a covering, an enveloping layer. The story behind a house of Indian heritage carpets.",
  alternates: { canonical: "/our-story" },
};

export default async function OurStoryPage() {
  const story = await getContent("story");
  const [first, second, ...rest] = story.paragraphs;
  return (
    <>
      <section className="on-dark jaali text-ivory">
        <div className="container-site py-28 text-center lg:py-40">
          <p className="label text-gold">Our Story</p>
          <h1 className="mx-auto mt-8 max-w-4xl font-serif text-5xl leading-tight sm:text-7xl">{site.tagline}</h1>
          <p className="mt-8 font-serif text-4xl text-gold">{site.devanagari}</p>
        </div>
      </section>

      <section className="container-site max-w-3xl py-24 lg:py-32">
        <Reveal>
          <p className="font-serif text-3xl leading-snug sm:text-4xl">{first}</p>
          <p className="mt-8 text-lg leading-relaxed text-muted">{second}</p>
        </Reveal>
      </section>

      <section className="container-site grid items-center gap-16 pb-24 lg:grid-cols-2 lg:pb-32">
        <Reveal>
          <Motif className="aspect-[4/5] w-full" tone="walnut" seed={4} showLabel={false} label="Decorative motif" />
        </Reveal>
        <Reveal delay={150}>
          <div className="space-y-6 text-[1.0625rem] leading-relaxed text-ink/90">
            {rest.map((p) => (
              <p key={p.slice(0, 24)}>{p}</p>
            ))}
          </div>
          <p className="label mt-12 text-walnut">{site.statement}</p>
          <p className="mt-3 text-sm text-muted">
            AAVARAN is a house of{" "}
            <a href={site.parentUrl} className="underline underline-offset-4" rel="noopener">
              {site.parent}
            </a>
            .
          </p>
        </Reveal>
      </section>

      <section className="bg-sandstone/50 py-20 text-center">
        <ButtonLink href="/collections">Explore the Collections</ButtonLink>
      </section>
    </>
  );
}
