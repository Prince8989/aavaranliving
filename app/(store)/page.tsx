import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Motif } from "@/components/ui/Motif";
import { Reveal } from "@/components/ui/Reveal";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ProductGrid } from "@/components/product/ProductCard";
import { NewsletterForm } from "@/components/forms/NewsletterForm";
import { JsonLd } from "@/components/ui/JsonLd";
import { getCollections, getFeaturedProducts } from "@/lib/catalog";
import { countWord } from "@/lib/format-words";
import { getContent } from "@/lib/content";
import { db } from "@/lib/db";
import { getCurrency } from "@/lib/preferences";
import { absoluteUrl, site } from "@/lib/site";

export const metadata = { alternates: { canonical: "/" } };

const CRAFT_POINTS = [
  { title: "Fibre", text: "Wool, silk, cotton and plant fibres — each chosen for how it feels, wears and holds colour." },
  { title: "Technique", text: "Hand-knotting, hand-tufting and flat-weaving each give a carpet a distinct character and life." },
  { title: "Texture", text: "Pile height, finish and surface carving shape how light falls across a carpet." },
  { title: "Workmanship", text: "Small variations of tone and line are the signature of work made by hand." },
];

export default async function HomePage() {
  const currency = await getCurrency();
  const [hero, philosophy, craft, bespoke, collections, featured, articles] = await Promise.all([
    getContent("hero"),
    getContent("philosophy"),
    getContent("craft"),
    getContent("bespoke"),
    getCollections(),
    getFeaturedProducts(currency, 4),
    db.journalArticle.findMany({ where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" }, take: 3 }),
  ]);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "AAVARAN",
          url: site.url,
          logo: absoluteUrl("/icon.svg"),
          parentOrganization: { "@type": "Organization", name: site.parent, url: site.parentUrl },
          slogan: site.tagline,
        }}
      />

      {/* Hero */}
      <section className="on-dark jaali relative -mt-20 flex min-h-[92vh] items-center overflow-hidden text-ivory">
        <div className="absolute inset-0 bg-gradient-to-b from-obsidian/40 via-obsidian/10 to-obsidian/80" aria-hidden="true" />
        <div className="container-site relative pt-32 pb-24 text-center">
          <Reveal>
            <p className="label text-gold">{hero.eyebrow}</p>
            <h1 className="mx-auto mt-8 max-w-5xl font-serif text-[3.25rem] leading-[1.02] sm:text-7xl lg:text-[6.5rem]">{hero.headline}</h1>
            <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-sandstone/90">{hero.subheading}</p>
            <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <ButtonLink href="/collections" variant="light">
                Explore Collections
              </ButtonLink>
              <ButtonLink href="/our-story" variant="outline-light">
                Discover Our Story
              </ButtonLink>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Philosophy */}
      <section className="container-site py-28 lg:py-40">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <Reveal>
            <SectionHeading align="left" eyebrow="Our Philosophy" title={philosophy.headline} />
            <div className="mt-8 space-y-5 text-[1.0625rem] leading-relaxed text-muted">
              {philosophy.body.map((p) => (
                <p key={p.slice(0, 20)}>{p}</p>
              ))}
            </div>
            <div className="mt-10">
              <ButtonLink href="/our-story" variant="ghost">
                Read our story →
              </ButtonLink>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <div className="relative">
              <Motif className="aspect-[4/5] w-full" tone="walnut" seed={2} showLabel={false} label="Decorative motif" />
              <p className="absolute -bottom-8 -left-4 bg-ivory px-6 py-5 font-serif text-5xl text-walnut sm:-left-10">{site.devanagari}</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Collections */}
      <section className="bg-sandstone/50 py-28 lg:py-36">
        <div className="container-site">
          <Reveal>
            <SectionHeading eyebrow="The Collections" title={`${countWord(collections.length)} expressions of belonging`} />
          </Reveal>
          <div className={`mt-16 grid gap-6 sm:grid-cols-2 ${collections.length === 5 ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
            {collections.map((c, i) => (
              <Reveal key={c.id} delay={i * 100}>
                <Link href={`/collections/${c.slug}`} className="group block">
                  <div className="relative aspect-[3/4] overflow-hidden">
                    {c.image ? (
                      <Image src={c.image} alt="" fill sizes="(min-width: 1024px) 20vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-[1.4s] ease-luxe group-hover:scale-105" />
                    ) : (
                      <Motif className="h-full w-full transition-transform duration-[1.4s] ease-luxe group-hover:scale-105" tone={i % 2 ? "walnut" : "dark"} seed={i + 3} showLabel={false} label={c.name} />
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-obsidian/90 to-transparent p-6 pt-20 text-ivory">
                      <h3 className="font-serif text-2xl">{c.name}</h3>
                      <p className="mt-2 text-sm text-sandstone/90">{c.tagline}</p>
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Featured products */}
      {featured.length > 0 && (
        <section className="container-site py-28 lg:py-36">
          <Reveal>
            <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
              <SectionHeading align="left" eyebrow="Selected Pieces" title="From the collections" />
              <ButtonLink href="/collections/all" variant="ghost">
                View all carpets →
              </ButtonLink>
            </div>
          </Reveal>
          <div className="mt-14">
            <ProductGrid products={featured} />
          </div>
        </section>
      )}

      {/* Craftsmanship */}
      <section className="on-dark bg-obsidian py-28 text-ivory lg:py-40">
        <div className="container-site">
          <Reveal>
            <SectionHeading dark eyebrow="The Craft" title={craft.headline} intro={craft.body} />
          </Reveal>
          <div className="mt-20 grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
            {CRAFT_POINTS.map((c, i) => (
              <Reveal key={c.title} delay={i * 100}>
                <p className="font-serif text-5xl text-gold/60">0{i + 1}</p>
                <h3 className="mt-4 font-serif text-2xl">{c.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-sandstone/80">{c.text}</p>
              </Reveal>
            ))}
          </div>
          <div className="mt-16 text-center">
            <ButtonLink href="/the-craft" variant="outline-light">
              Explore the craft
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* Lifestyle editorial */}
      <section className="container-site py-28 lg:py-36">
        <div className="grid gap-6 lg:grid-cols-12">
          <Reveal className="lg:col-span-7">
            <Motif className="aspect-[4/3] w-full" tone="dark" seed={7} label="Interior photography forthcoming" />
          </Reveal>
          <Reveal delay={150} className="flex flex-col justify-center lg:col-span-5 lg:pl-12">
            <p className="label text-walnut">In the Home</p>
            <h2 className="mt-5 font-serif text-4xl leading-tight sm:text-5xl">The foundation of a room</h2>
            <p className="mt-6 leading-relaxed text-muted">
              A carpet gathers the elements of a space — furniture, light, colour — into one composition. It sets the tone for conversations,
              celebrations and quiet mornings alike.
            </p>
            <div className="mt-8">
              <ButtonLink href="/journal/choosing-the-right-carpet-size" variant="ghost">
                Choosing the right size →
              </ButtonLink>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Bespoke */}
      <section className="bg-sandstone/50">
        <div className="container-site grid items-center gap-12 py-28 lg:grid-cols-2 lg:py-36">
          <Reveal>
            <SectionHeading align="left" eyebrow="Bespoke" title={bespoke.headline} intro={bespoke.body} />
            <ul className="mt-8 space-y-2 text-sm text-muted">
              <li>— Custom dimensions for any room</li>
              <li>— Colours matched to your interior</li>
              <li>— Designs developed with you</li>
            </ul>
            <div className="mt-10">
              <ButtonLink href="/bespoke">Begin a bespoke enquiry</ButtonLink>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <Motif className="aspect-square w-full" tone="light" seed={5} showLabel={false} label="Decorative motif" />
          </Reveal>
        </div>
      </section>

      {/* Journal */}
      {articles.length > 0 && (
        <section className="container-site py-28 lg:py-36">
          <Reveal>
            <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
              <SectionHeading align="left" eyebrow="Journal" title="Notes on carpets and the home" />
              <ButtonLink href="/journal" variant="ghost">
                All stories →
              </ButtonLink>
            </div>
          </Reveal>
          <div className="mt-14 grid gap-10 md:grid-cols-3">
            {articles.map((a, i) => (
              <Reveal key={a.id} delay={i * 100}>
                <Link href={`/journal/${a.slug}`} className="group block">
                  <Motif className="aspect-[4/3] w-full" tone={i === 1 ? "walnut" : "dark"} seed={i + 9} showLabel={false} label={a.title} />
                  {a.topic && <p className="label mt-5 text-walnut">{a.topic}</p>}
                  <h3 className="mt-3 font-serif text-2xl leading-snug group-hover:text-walnut">{a.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{a.excerpt}</p>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* Newsletter */}
      <section className="on-dark bg-walnut text-ivory">
        <div className="container-site grid items-center gap-10 py-20 lg:grid-cols-2">
          <div>
            <p className="label text-sandstone">{site.statement}</p>
            <h2 className="mt-4 font-serif text-4xl">Letters from the house of AAVARAN</h2>
            <p className="mt-4 max-w-md text-sandstone/90">New collections, stories from the journal and the occasional invitation. Never more than we&apos;d want to receive ourselves.</p>
          </div>
          <NewsletterForm dark />
        </div>
      </section>
    </>
  );
}
