import "server-only";
import { cache } from "react";
import { db, type Prisma } from "@/lib/db";
import type { Currency } from "@/lib/generated/prisma/enums";
import { sampleProductsVisible } from "@/lib/site";
import { availabilityMap } from "@/lib/inventory";
import { areaM2, SIZE_BUCKETS } from "@/lib/units";

export const PAGE_SIZE = 12;

import { SORTS, type SortKey } from "@/lib/catalog-sorts";
export { SORTS, type SortKey };

export type CatalogFilters = {
  q?: string;
  collection?: string;
  colour?: string[];
  material?: string[];
  construction?: string[];
  size?: string[];
  minPrice?: number; // minor units in `currency`
  maxPrice?: number;
  inStock?: boolean;
  sort?: SortKey;
  page?: number;
};

export function visibleProductWhere(): Prisma.ProductWhereInput {
  return {
    status: "PUBLISHED",
    ...(sampleProductsVisible() ? {} : { isSample: false }),
  };
}

const listInclude = {
  images: { orderBy: { sortOrder: "asc" }, take: 2 },
  variants: {
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: { prices: true },
  },
  collections: { include: { collection: { select: { slug: true, name: true } } } },
} satisfies Prisma.ProductInclude;

export type ListProduct = Prisma.ProductGetPayload<{ include: typeof listInclude }>;

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  collection: string | null;
  sizeLabel: string | null; // "3 sizes" or the single size
  fromPrice: number | null; // minor units in requested currency; null = not offered in this currency
  currency: Currency;
  available: boolean;
  isSample: boolean;
  image: { url: string; alt: string } | null;
  hoverImage: { url: string; alt: string } | null;
  createdAt: Date;
  featuredRank: number | null;
  sizes: { lengthCm: number; widthCm: number }[];
};

export function toCard(p: ListProduct, currency: Currency, availability: Map<string, number>): ProductCardData {
  const prices = p.variants
    .map((v) => v.prices.find((pr) => pr.currency === currency)?.amount)
    .filter((a): a is number => a != null);
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    collection: p.collections[0]?.collection.name ?? null,
    sizeLabel: p.variants.length === 1 ? p.variants[0].label : p.variants.length > 1 ? `${p.variants.length} sizes` : null,
    fromPrice: prices.length ? Math.min(...prices) : null,
    currency,
    available: p.variants.some((v) => (availability.get(v.id) ?? 0) > 0),
    isSample: p.isSample,
    image: p.images[0] ? { url: p.images[0].url, alt: p.images[0].alt } : null,
    hoverImage: p.images[1] ? { url: p.images[1].url, alt: p.images[1].alt } : null,
    createdAt: p.createdAt,
    featuredRank: p.featuredRank,
    sizes: p.variants.map((v) => ({ lengthCm: v.lengthCm, widthCm: v.widthCm })),
  };
}

function inList(values?: string[]) {
  return values && values.length ? { in: values, mode: "insensitive" as const } : undefined;
}

/**
 * Catalogue search. Text/attribute filters run in SQL; price, size and availability depend on
 * per-currency variant data and are applied after load. Suitable for catalogues of a few thousand products.
 */
export async function searchProducts(filters: CatalogFilters, currency: Currency) {
  const q = filters.q?.trim().slice(0, 100);
  const where: Prisma.ProductWhereInput = {
    ...visibleProductWhere(),
    ...(filters.collection && filters.collection !== "all"
      ? { collections: { some: { collection: { slug: filters.collection } } } }
      : {}),
    ...(filters.colour?.length ? { colour: inList(filters.colour) } : {}),
    ...(filters.material?.length ? { material: inList(filters.material) } : {}),
    ...(filters.construction?.length ? { construction: inList(filters.construction) } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { colour: { contains: q, mode: "insensitive" } },
            { material: { contains: q, mode: "insensitive" } },
            { pattern: { contains: q, mode: "insensitive" } },
            { construction: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const products = await db.product.findMany({ where, include: listInclude, take: 2000 });
  const availability = await availabilityMap(products.flatMap((p) => p.variants.map((v) => v.id)));
  let cards = products.map((p) => toCard(p, currency, availability));

  if (filters.minPrice != null) cards = cards.filter((c) => c.fromPrice != null && c.fromPrice >= filters.minPrice!);
  if (filters.maxPrice != null) cards = cards.filter((c) => c.fromPrice != null && c.fromPrice <= filters.maxPrice!);
  if (filters.inStock) cards = cards.filter((c) => c.available);
  if (filters.size?.length) {
    const buckets = SIZE_BUCKETS.filter((b) => filters.size!.includes(b.id));
    cards = cards.filter((c) =>
      c.sizes.some((s) => buckets.some((b) => areaM2(s.lengthCm, s.widthCm) >= b.min && areaM2(s.lengthCm, s.widthCm) < b.max))
    );
  }

  cards = sortCards(cards, filters.sort ?? "featured");
  const total = cards.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(Math.max(1, filters.page ?? 1), pageCount);
  return { items: cards.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), total, page, pageCount };
}

export function sortCards(cards: ProductCardData[], sort: SortKey): ProductCardData[] {
  const priced = (c: ProductCardData, dir: 1 | -1) => (c.fromPrice == null ? Infinity : c.fromPrice * dir);
  const copy = [...cards];
  switch (sort) {
    case "price-asc":
      return copy.sort((a, b) => priced(a, 1) - priced(b, 1));
    case "price-desc":
      return copy.sort((a, b) => priced(a, -1) - priced(b, -1));
    case "newest":
      return copy.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    case "name":
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return copy.sort(
        (a, b) => (a.featuredRank ?? 9999) - (b.featuredRank ?? 9999) || b.createdAt.getTime() - a.createdAt.getTime()
      );
  }
}

/** Distinct values for filter options, from visible products only. */
export const getFilterFacets = cache(async () => {
  const rows = await db.product.findMany({
    where: visibleProductWhere(),
    select: { colour: true, material: true, construction: true },
  });
  const uniq = (key: "colour" | "material" | "construction") =>
    [...new Set(rows.map((r) => r[key]).filter((v): v is string => !!v))].sort();
  return { colours: uniq("colour"), materials: uniq("material"), constructions: uniq("construction") };
});

export async function getFeaturedProducts(currency: Currency, limit = 4) {
  const products = await db.product.findMany({
    where: { ...visibleProductWhere(), featured: true },
    include: listInclude,
    orderBy: [{ featuredRank: "asc" }, { createdAt: "desc" }],
    take: limit,
  });
  const availability = await availabilityMap(products.flatMap((p) => p.variants.map((v) => v.id)));
  return products.map((p) => toCard(p, currency, availability));
}

export const getProductBySlug = cache(async (slug: string) => {
  return db.product.findFirst({
    where: { slug, ...visibleProductWhere() },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: { where: { isActive: true }, orderBy: { sortOrder: "asc" }, include: { prices: true } },
      collections: { include: { collection: true } },
    },
  });
});

export async function getRedirectForSlug(slug: string) {
  const r = await db.slugRedirect.findUnique({ where: { fromSlug: slug }, include: { product: { select: { slug: true } } } });
  return r?.product.slug ?? null;
}

export async function getRelatedProducts(productId: string, collectionIds: string[], currency: Currency, limit = 4) {
  const products = await db.product.findMany({
    where: {
      ...visibleProductWhere(),
      id: { not: productId },
      ...(collectionIds.length ? { collections: { some: { collectionId: { in: collectionIds } } } } : {}),
    },
    include: listInclude,
    take: limit,
    orderBy: { createdAt: "desc" },
  });
  const availability = await availabilityMap(products.flatMap((p) => p.variants.map((v) => v.id)));
  return products.map((p) => toCard(p, currency, availability));
}

export const getCollections = cache(async () =>
  db.collection.findMany({ where: { isPublished: true }, orderBy: { sortOrder: "asc" } })
);

export const getCollectionBySlug = cache(async (slug: string) =>
  db.collection.findFirst({ where: { slug, isPublished: true } })
);
