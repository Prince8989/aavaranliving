import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const statics = ["/", "/collections", "/collections/all", "/our-story", "/the-craft", "/journal", "/bespoke", "/contact"];
  const [collections, products, articles] = await Promise.all([
    db.collection.findMany({ where: { isPublished: true }, select: { slug: true, updatedAt: true } }),
    // Sample products are never listed in the sitemap.
    db.product.findMany({ where: { status: "PUBLISHED", isSample: false }, select: { slug: true, updatedAt: true } }),
    db.journalArticle.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
  ]);
  return [
    ...statics.map((p) => ({ url: absoluteUrl(p) })),
    ...collections.map((c) => ({ url: absoluteUrl(`/collections/${c.slug}`), lastModified: c.updatedAt })),
    ...products.map((p) => ({ url: absoluteUrl(`/products/${p.slug}`), lastModified: p.updatedAt })),
    ...articles.map((a) => ({ url: absoluteUrl(`/journal/${a.slug}`), lastModified: a.updatedAt })),
  ];
}
