import type { Metadata } from "next";
import { getContent } from "@/lib/content";
import { getProductBySlug } from "@/lib/catalog";
import { BespokeForm } from "@/components/forms/BespokeForm";
import { SectionHeading } from "@/components/ui/SectionHeading";

export const metadata: Metadata = {
  title: "Bespoke",
  description: "Commission a carpet made for your space — custom dimensions, colours and designs.",
  alternates: { canonical: "/bespoke" },
};

const STEPS = [
  { title: "Share your space", text: "Tell us the room, the dimensions and the feeling you want to create." },
  { title: "Explore together", text: "We'll discuss colours, materials and design directions with you." },
  { title: "Confirm the details", text: "You'll receive a clear proposal covering specification, timeline and price before anything begins." },
];

export default async function BespokePage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const [content, { product }] = await Promise.all([getContent("bespoke"), searchParams]);
  const p = product ? await getProductBySlug(product) : null;
  return (
    <div className="container-site py-24 lg:py-32">
      <SectionHeading as="h1" eyebrow="Bespoke" title={content.headline} intro={content.body} />
      <ol className="mx-auto mt-20 grid max-w-5xl gap-10 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="border-t border-ink/15 pt-6">
            <p className="font-serif text-4xl text-gold">0{i + 1}</p>
            <h2 className="mt-3 font-serif text-2xl">{s.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
          </li>
        ))}
      </ol>
      <div className="mx-auto mt-24 max-w-3xl">
        <h2 className="mb-10 font-serif text-3xl">Begin your enquiry</h2>
        <BespokeForm productName={p?.name} />
      </div>
    </div>
  );
}
