import { z } from "zod";
import { db } from "@/lib/db";
import { CURRENCIES } from "@/lib/markets";
import { toMinorUnits } from "@/lib/money";
import { audit } from "@/lib/audit";

const slug = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens").max(120);
const optText = (max: number) => z.string().trim().max(max).optional().transform((v) => (v ? v : null));
const money = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || /^\d+(\.\d{1,2})?$/.test(v), "Enter a price like 1250 or 1250.00");

export const variantInput = z.object({
  id: z.string().optional(),
  sku: z.string().trim().min(1, "SKU required").max(60),
  label: z.string().trim().min(1, "Size label required").max(60),
  lengthCm: z.coerce.number().int().positive("Length (cm) required").max(5000),
  widthCm: z.coerce.number().int().positive("Width (cm) required").max(5000),
  weightGrams: z.coerce.number().int().positive().max(1_000_000).optional().nullable(),
  stock: z.coerce.number().int().min(0).max(100_000),
  isActive: z.coerce.boolean().default(true),
  prices: z.object(Object.fromEntries(CURRENCIES.map((c) => [c, money])) as Record<(typeof CURRENCIES)[number], typeof money>),
});

export const imageInput = z.object({
  url: z.string().trim().min(1).max(1000).refine((u) => u.startsWith("https://") || u.startsWith("/uploads/"), "Image URL must be https or an uploaded file"),
  alt: z.string().trim().min(3, "Describe the image for screen readers").max(200),
  kind: z.enum(["GALLERY", "TEXTURE", "ROOM"]),
});

export const productInput = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(160),
  slug,
  sku: z.string().trim().min(1).max(60),
  description: z.string().trim().min(10, "Add a description").max(5000),
  material: optText(200),
  construction: optText(120),
  countryOfOrigin: optText(80),
  colour: optText(80),
  pattern: optText(80),
  pileHeightMm: z.coerce.number().int().min(0).max(200).optional().nullable(),
  careInstructions: optText(3000),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  featured: z.coerce.boolean().default(false),
  featuredRank: z.coerce.number().int().min(0).max(999).optional().nullable(),
  seoTitle: optText(70),
  seoDescription: optText(160),
  isSample: z.coerce.boolean().default(false),
  collectionIds: z.array(z.string()).max(10).default([]),
  variants: z.array(variantInput).min(1, "Add at least one size").max(20),
  images: z.array(imageInput).max(30).default([]),
});
export type ProductInput = z.input<typeof productInput>;

export class AdminError extends Error {}

export async function saveProduct(raw: ProductInput, actorId: string) {
  const input = productInput.parse(raw);
  const skus = input.variants.map((v) => v.sku);
  if (new Set(skus).size !== skus.length) throw new AdminError("Each size needs a unique SKU.");
  if (input.status === "PUBLISHED" && input.variants.every((v) => Object.values(v.prices).every((p) => !p))) {
    throw new AdminError("A published product needs at least one price.");
  }

  return db.$transaction(async (tx) => {
    const existing = input.id ? await tx.product.findUnique({ where: { id: input.id }, include: { variants: true } }) : null;
    if (input.id && !existing) throw new AdminError("Product not found.");

    const data = {
      name: input.name,
      slug: input.slug,
      sku: input.sku,
      description: input.description,
      material: input.material,
      construction: input.construction,
      countryOfOrigin: input.countryOfOrigin,
      colour: input.colour,
      pattern: input.pattern,
      pileHeightMm: input.pileHeightMm ?? null,
      careInstructions: input.careInstructions,
      status: input.status,
      featured: input.featured,
      featuredRank: input.featuredRank ?? null,
      seoTitle: input.seoTitle,
      seoDescription: input.seoDescription,
      isSample: input.isSample,
      publishedAt: input.status === "PUBLISHED" ? (existing?.publishedAt ?? new Date()) : existing?.publishedAt ?? null,
    };

    const product = existing ? await tx.product.update({ where: { id: existing.id }, data }) : await tx.product.create({ data });

    // Changed URL: keep the old one working with a permanent redirect.
    if (existing && existing.slug !== input.slug) {
      await tx.slugRedirect.upsert({
        where: { fromSlug: existing.slug },
        create: { fromSlug: existing.slug, productId: product.id },
        update: { productId: product.id },
      });
      await tx.slugRedirect.deleteMany({ where: { fromSlug: input.slug } });
    }

    await tx.productCollection.deleteMany({ where: { productId: product.id } });
    if (input.collectionIds.length) {
      await tx.productCollection.createMany({ data: input.collectionIds.map((collectionId) => ({ productId: product.id, collectionId })) });
    }

    const keep = new Set(input.variants.map((v) => v.id).filter(Boolean));
    const removed = (existing?.variants ?? []).filter((v) => !keep.has(v.id)).map((v) => v.id);
    if (removed.length) await tx.productVariant.deleteMany({ where: { id: { in: removed } } });

    for (const [i, v] of input.variants.entries()) {
      const vData = {
        sku: v.sku,
        label: v.label,
        lengthCm: v.lengthCm,
        widthCm: v.widthCm,
        weightGrams: v.weightGrams ?? null,
        stock: v.stock,
        isActive: v.isActive,
        sortOrder: i,
      };
      const variant =
        v.id && existing?.variants.some((ev) => ev.id === v.id)
          ? await tx.productVariant.update({ where: { id: v.id }, data: vData })
          : await tx.productVariant.create({ data: { ...vData, productId: product.id } });

      for (const currency of CURRENCIES) {
        const p = v.prices[currency];
        if (p) {
          const amount = toMinorUnits(p);
          await tx.variantPrice.upsert({
            where: { variantId_currency: { variantId: variant.id, currency } },
            create: { variantId: variant.id, currency, amount },
            update: { amount },
          });
        } else {
          await tx.variantPrice.deleteMany({ where: { variantId: variant.id, currency } });
        }
      }
    }

    await tx.productImage.deleteMany({ where: { productId: product.id } });
    if (input.images.length) {
      await tx.productImage.createMany({
        data: input.images.map((img, i) => ({ productId: product.id, url: img.url, alt: img.alt, kind: img.kind, sortOrder: i })),
      });
    }

    await audit({ actorId, action: existing ? "product.update" : "product.create", entity: "Product", entityId: product.id, data: { slug: product.slug, status: product.status } }, tx);
    return product;
  });
}

/** Products with order history are archived (never hard-deleted) to preserve records. */
export async function deleteOrArchiveProduct(id: string, actorId: string) {
  const orders = await db.orderItem.count({ where: { productId: id } });
  if (orders > 0) {
    await db.product.update({ where: { id }, data: { status: "ARCHIVED", featured: false } });
    await audit({ actorId, action: "product.archive", entity: "Product", entityId: id });
    return "archived" as const;
  }
  await db.product.delete({ where: { id } });
  await audit({ actorId, action: "product.delete", entity: "Product", entityId: id });
  return "deleted" as const;
}
