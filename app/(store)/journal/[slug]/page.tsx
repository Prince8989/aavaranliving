import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { SimpleMarkdown } from "@/components/ui/SimpleMarkdown";
import { JsonLd } from "@/components/ui/JsonLd";
import { absoluteUrl } from "@/lib/site";

type Props = { params: Promise<{ slug: string }> };

const getArticle = cache((slug: string) => db.journalArticle.findFirst({ where: { slug, status: "PUBLISHED" } }));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const a = await getArticle((await params).slug);
  if (!a) return {};
  return {
    title: a.seoTitle ?? a.title,
    description: a.seoDescription ?? a.excerpt,
    alternates: { canonical: `/journal/${a.slug}` },
    openGraph: { type: "article", title: a.title, description: a.excerpt, publishedTime: a.publishedAt?.toISOString() },
  };
}

export default async function ArticlePage({ params }: Props) {
  const a = await getArticle((await params).slug);
  if (!a) notFound();
  return (
    <article className="container-site max-w-3xl py-20 lg:py-28">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: a.title,
          description: a.excerpt,
          datePublished: a.publishedAt?.toISOString(),
          dateModified: a.updatedAt.toISOString(),
          publisher: { "@type": "Organization", name: "AAVARAN" },
          mainEntityOfPage: absoluteUrl(`/journal/${a.slug}`),
        }}
      />
      <Link href="/journal" className="label text-walnut hover:underline">
        ← Journal
      </Link>
      {a.topic && <p className="label mt-10 text-muted">{a.topic}</p>}
      <h1 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">{a.title}</h1>
      <p className="mt-6 text-lg leading-relaxed text-muted">{a.excerpt}</p>
      {a.publishedAt && (
        <p className="mt-6 text-xs text-muted">
          <time dateTime={a.publishedAt.toISOString()}>{a.publishedAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</time>
        </p>
      )}
      <hr className="my-12 border-ink/10" />
      <SimpleMarkdown source={a.body} />
    </article>
  );
}
