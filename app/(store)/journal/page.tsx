import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/lib/db";
import { Motif } from "@/components/ui/Motif";
import { SectionHeading } from "@/components/ui/SectionHeading";

export const metadata: Metadata = {
  title: "Journal",
  description: "Stories on Indian carpet heritage, materials, styling, interior design and carpet care.",
  alternates: { canonical: "/journal" },
};

export default async function JournalPage() {
  const articles = await db.journalArticle.findMany({ where: { status: "PUBLISHED" }, orderBy: { publishedAt: "desc" } });
  return (
    <div className="container-site py-24 lg:py-32">
      <SectionHeading as="h1" eyebrow="Journal" title="Notes on carpets and the home" />
      {articles.length === 0 ? (
        <p className="mt-16 text-center text-muted">New stories are being written.</p>
      ) : (
        <div className="mt-20 grid gap-x-10 gap-y-16 md:grid-cols-2 lg:grid-cols-3">
          {articles.map((a, i) => (
            <article key={a.id}>
              <Link href={`/journal/${a.slug}`} className="group block">
                <div className="relative aspect-[4/3] overflow-hidden">
                  {a.coverImage ? (
                    <Image src={a.coverImage} alt={a.coverAlt ?? ""} fill sizes="(min-width:1024px) 33vw, 100vw" className="object-cover transition-transform duration-1000 group-hover:scale-105" />
                  ) : (
                    <Motif className="h-full w-full" tone={i % 2 ? "walnut" : "dark"} seed={i + 9} showLabel={false} label={a.title} />
                  )}
                </div>
                {a.topic && <p className="label mt-5 text-walnut">{a.topic}</p>}
                <h2 className="mt-3 font-serif text-2xl leading-snug group-hover:text-walnut">{a.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-muted">{a.excerpt}</p>
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
