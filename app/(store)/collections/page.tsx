import Link from "next/link";
import type { Metadata } from "next";
import { getCollections } from "@/lib/catalog";
import { Motif } from "@/components/ui/Motif";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Collections",
  description: "Explore AAVARAN's four collections — Earth, Heritage, Form and Signature — premium carpets inspired by India's textile traditions.",
  alternates: { canonical: "/collections" },
};

export default async function CollectionsPage() {
  const collections = await getCollections();
  return (
    <div className="container-site py-20 lg:py-28">
      <SectionHeading as="h1" eyebrow="The Collections" title="Four expressions of belonging" intro="Each collection interprets India's textile heritage in its own language — from quiet natural textures to statement designs." />
      <div className="mt-20 space-y-24">
        {collections.map((c, i) => (
          <Reveal key={c.id}>
            <article className={`grid items-center gap-10 lg:grid-cols-2 ${i % 2 ? "lg:[&>*:first-child]:order-2" : ""}`}>
              <Link href={`/collections/${c.slug}`} className="group block overflow-hidden">
                <Motif className="aspect-[5/4] w-full transition-transform duration-[1.4s] ease-luxe group-hover:scale-105" tone={i % 2 ? "walnut" : "dark"} seed={i + 3} label={`${c.name} — photography forthcoming`} />
              </Link>
              <div className="lg:px-10">
                <p className="label text-walnut">Collection 0{i + 1}</p>
                <h2 className="mt-4 font-serif text-4xl sm:text-5xl">{c.name}</h2>
                <p className="mt-4 font-serif text-xl italic text-walnut">{c.tagline}</p>
                {c.description && <p className="mt-6 leading-relaxed text-muted">{c.description}</p>}
                <div className="mt-8">
                  <ButtonLink href={`/collections/${c.slug}`} variant="outline">
                    Explore {c.name.replace(/^The /, "")}
                  </ButtonLink>
                </div>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
      <div className="mt-24 text-center">
        <ButtonLink href="/collections/all">View all carpets</ButtonLink>
      </div>
    </div>
  );
}
