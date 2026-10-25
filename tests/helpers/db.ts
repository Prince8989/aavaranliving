import { db } from "@/lib/db";

/** Empties every table (test database only). */
export async function resetDb() {
  const url = process.env.DATABASE_URL ?? "";
  if (!url.includes("test")) throw new Error(`Refusing to reset a non-test database: ${url}`);
  const tables = await db.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
  const list = tables.map((t) => `"${t.tablename}"`).join(", ");
  if (list) await db.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
}

let n = 0;
export async function makeProduct(opts: { stock?: number; usd?: number; gbp?: number | null; status?: "PUBLISHED" | "DRAFT"; isSample?: boolean } = {}) {
  n += 1;
  const collection = await db.collection.upsert({
    where: { slug: "test-collection" },
    create: { slug: "test-collection", name: "Test Collection" },
    update: {},
  });
  return db.product.create({
    data: {
      slug: `test-rug-${n}`,
      sku: `TEST-${n}`,
      name: `Test Rug ${n}`,
      description: "A carpet used by automated tests.",
      status: opts.status ?? "PUBLISHED",
      isSample: opts.isSample ?? false,
      colour: "Sand",
      collections: { create: { collectionId: collection.id } },
      variants: {
        create: {
          sku: `TEST-${n}-58`,
          label: "5 × 8 ft",
          widthCm: 152,
          lengthCm: 244,
          stock: opts.stock ?? 3,
          prices: {
            create: [
              { currency: "USD", amount: opts.usd ?? 100000 },
              ...(opts.gbp === null ? [] : [{ currency: "GBP" as const, amount: opts.gbp ?? 80000 }]),
            ],
          },
        },
      },
    },
    include: { variants: true },
  });
}

export async function makeShipping() {
  await db.shippingRate.createMany({
    data: [
      { zone: "US", currency: "USD", amount: 15000, label: "Test delivery" },
      { zone: "UK", currency: "GBP", amount: 12000, freeOverAmount: 500000, label: "Test delivery" },
    ],
    skipDuplicates: true,
  });
}

export async function makeCart(variantId: string, quantity = 1) {
  return db.cart.create({ data: { items: { create: { variantId, quantity } } } });
}
