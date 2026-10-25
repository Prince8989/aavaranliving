import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCollectionBySlug } from "@/lib/catalog";
import { CatalogListing, type SearchParams } from "@/components/product/CatalogListing";
import { JsonLd } from "@/components/ui/JsonLd";
import { absoluteUrl } from "@/lib/site";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (slug === "all") {
    return { title: "All Carpets", description: "Browse every AAVARAN carpet.", alternates: { canonical: "/collections/all" } };
  }
  const c = await getCollectionBySlug(slug);
  if (!c) return {};
  return {
    title: c.seoTitle ?? c.name,
    description: c.seoDescription ?? c.tagline ?? undefined,
    // Filter, sort and currency choices never create new canonical URLs.
    alternates: { canonical: `/collections/${c.slug}` },
  };
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const collection = slug === "all" ? null : await getCollectionBySlug(slug);
  if (slug !== "all" && !collection) notFound();
  const title = collection?.name ?? "All Carpets";

  return (
    <div className="container-site py-16 lg:py-24">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
            { "@type": "ListItem", position: 2, name: "Collections", item: absoluteUrl("/collections") },
            { "@type": "ListItem", position: 3, name: title, item: absoluteUrl(`/collections/${slug}`) },
          ],
        }}
      />
      <nav aria-label="Breadcrumb" className="mb-10 text-xs text-muted">
        <ol className="flex gap-2">
          <li>
            <Link href="/" className="hover:text-ink">Home</Link> /
          </li>
          <li>
            <Link href="/collections" className="hover:text-ink">Collections</Link> /
          </li>
          <li aria-current="page" className="text-ink">{title}</li>
        </ol>
      </nav>
      <header className="mb-16 max-w-3xl">
        <h1 className="font-serif text-5xl leading-tight sm:text-6xl">{title}</h1>
        {collection?.tagline && <p className="mt-4 font-serif text-xl italic text-walnut">{collection.tagline}</p>}
        {collection?.description && <p className="mt-6 leading-relaxed text-muted">{collection.description}</p>}
      </header>
      <CatalogListing basePath={`/collections/${slug}`} searchParams={await searchParams} collection={slug} />
    </div>
  );
}
