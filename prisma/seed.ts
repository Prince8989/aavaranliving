/**
 * Usage:
 *   npm run db:seed                      → collections + journal articles (as DRAFT for review)
 *   SEED_SAMPLES=true npm run db:seed    → also sample products & sample shipping rates (development only)
 *
 * Idempotent: safe to run repeatedly. Never deletes data.
 */
import { db } from "../lib/db";
import { ARTICLES, COLLECTIONS, SAMPLE_PRODUCTS, SAMPLE_SHIPPING } from "./seed-data";

const withSamples = process.env.SEED_SAMPLES === "true";

async function main() {
  if (withSamples && process.env.NODE_ENV === "production" && process.env.ALLOW_SAMPLE_PRODUCTS !== "true") {
    throw new Error("Refusing to seed sample products into a production environment.");
  }

  for (const c of COLLECTIONS) {
    await db.collection.upsert({ where: { slug: c.slug }, create: c, update: {} });
  }

  for (const a of ARTICLES) {
    await db.journalArticle.upsert({
      where: { slug: a.slug },
      create: {
        ...a,
        status: withSamples ? "PUBLISHED" : "DRAFT",
        publishedAt: withSamples ? new Date() : null,
      },
      update: {},
    });
  }

  if (withSamples) {
    for (const p of SAMPLE_PRODUCTS) {
      const collection = await db.collection.findUniqueOrThrow({ where: { slug: p.collection } });
      const exists = await db.product.findUnique({ where: { slug: p.slug } });
      if (exists) continue;
      await db.product.create({
        data: {
          slug: p.slug,
          sku: p.sku,
          name: p.name,
          description: p.description,
          material: p.material,
          construction: p.construction,
          countryOfOrigin: "India",
          colour: p.colour,
          pattern: p.pattern,
          pileHeightMm: p.pileHeightMm,
          careInstructions: "Sample data. Vacuum without a beater bar; blot spills; professional cleaning only.",
          status: "PUBLISHED",
          isSample: true,
          featured: p.featured,
          featuredRank: p.featuredRank,
          publishedAt: new Date(),
          collections: { create: { collectionId: collection.id } },
          variants: {
            create: p.variants.map((v, i) => ({
              sku: `${p.sku}-${v.label.replace(/\D+/g, "")}`,
              label: v.label,
              widthCm: v.w,
              lengthCm: v.l,
              stock: v.stock,
              sortOrder: i,
              prices: {
                create: [
                  { currency: "USD" as const, amount: v.usd },
                  { currency: "GBP" as const, amount: v.gbp },
                  { currency: "EUR" as const, amount: v.eur },
                  { currency: "INR" as const, amount: v.inr },
                ],
              },
            })),
          },
        },
      });
    }
    for (const r of SAMPLE_SHIPPING) {
      await db.shippingRate.upsert({
        where: { zone_currency: { zone: r.zone, currency: r.currency } },
        create: { ...r },
        update: {},
      });
    }
  }

  console.log(`Seed complete${withSamples ? " (with development samples)" : ""}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
