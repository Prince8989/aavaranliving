import type { Metadata } from "next";
import { getContent } from "@/lib/content";
import { Motif } from "@/components/ui/Motif";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "The Craft",
  description: "Materials, construction techniques, texture and workmanship — how a fine carpet is made.",
  alternates: { canonical: "/the-craft" },
};

const SECTIONS = [
  {
    title: "Materials",
    text: "Wool is the traditional foundation of a fine carpet — resilient, warm and receptive to colour. Silk adds sheen and allows fine detail; cotton gives strength to foundations and flatweaves; plant fibres such as jute bring an earthy, natural texture. Each product page lists the materials used in that carpet.",
  },
  {
    title: "Hand-knotting",
    text: "Each knot is tied individually around the warp and cut to form the pile. Locked into the foundation, the knots make a carpet that can last for generations. Knot density determines how finely a design can be drawn.",
  },
  {
    title: "Hand-tufting",
    text: "Yarn is punched through a backing with a hand-held tool and secured with a backing layer. Tufting suits bold, graphic designs and offers a more accessible route to a handmade carpet.",
  },
  {
    title: "Flatweaving",
    text: "Without pile, flatweaves such as dhurries and kilims are woven by passing weft threads tightly through the warp. Light and often reversible, they are practical and quietly beautiful.",
  },
  {
    title: "Texture & finish",
    text: "Pile height, washing, and carving — cutting the pile to different heights — change how a carpet feels and how light moves across its surface.",
  },
  {
    title: "The mark of the hand",
    text: "Handwork produces small variations in tone (abrash), line and dimension. These are not flaws but the signature of a piece made by people rather than machines.",
  },
];

export default async function CraftPage() {
  const craft = await getContent("craft");
  return (
    <>
      <section className="container-site py-24 lg:py-32">
        <SectionHeading as="h1" eyebrow="The Craft" title={craft.headline} intro={craft.body} />
      </section>
      <section className="container-site space-y-24 pb-28">
        {SECTIONS.map((s, i) => (
          <Reveal key={s.title}>
            <div className={`grid items-center gap-12 lg:grid-cols-2 ${i % 2 ? "lg:[&>*:first-child]:order-2" : ""}`}>
              <Motif className="aspect-[4/3] w-full" tone={i % 3 === 0 ? "dark" : i % 3 === 1 ? "walnut" : "light"} seed={i + 11} label={`${s.title} — photography forthcoming`} />
              <div className="lg:px-8">
                <p className="font-serif text-5xl text-gold">0{i + 1}</p>
                <h2 className="mt-4 font-serif text-4xl">{s.title}</h2>
                <p className="mt-6 text-[1.0625rem] leading-relaxed text-muted">{s.text}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </section>
      <section className="on-dark bg-obsidian py-20 text-center text-ivory">
        <p className="font-serif text-3xl">Learn more in the Journal</p>
        <div className="mt-8">
          <ButtonLink href="/journal" variant="outline-light">
            Read the Journal
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
