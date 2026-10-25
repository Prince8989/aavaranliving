import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { deleteOrArchiveProduct, saveProduct, AdminError } from "@/lib/admin/products";
import { getProductBySlug, getRedirectForSlug, searchProducts } from "@/lib/catalog";
import { makeProduct, resetDb } from "../helpers/db";

let adminId: string;
beforeEach(async () => {
  await resetDb();
  adminId = (await db.user.create({ data: { email: "admin@test.local", role: "ADMIN" } })).id;
});
afterEach(() => vi.unstubAllEnvs());

const input = (overrides: Record<string, unknown> = {}) => ({
  name: "The Monsoon Field",
  slug: "the-monsoon-field",
  sku: "AAV-MF",
  description: "A hand-knotted carpet in rain-washed greens.",
  material: "Wool",
  construction: "Hand-knotted",
  countryOfOrigin: "India",
  colour: "Green",
  status: "PUBLISHED" as const,
  collectionIds: [] as string[],
  variants: [
    { sku: "AAV-MF-58", label: "5 × 8 ft", lengthCm: 244, widthCm: 152, stock: 2, isActive: true, prices: { USD: "1250.00", GBP: "990", EUR: "", INR: "" } },
    { sku: "AAV-MF-912", label: "9 × 12 ft", lengthCm: 366, widthCm: 274, stock: 0, isActive: true, prices: { USD: "3200", GBP: "", EUR: "", INR: "" } },
  ],
  images: [],
  ...overrides,
});

describe("product CRUD (admin service)", () => {
  it("creates a product with variants and a per-currency price book", async () => {
    const p = await saveProduct(input(), adminId);
    const full = await db.product.findUniqueOrThrow({ where: { id: p.id }, include: { variants: { include: { prices: true }, orderBy: { sortOrder: "asc" } } } });
    expect(full.variants).toHaveLength(2);
    expect(full.variants[0].prices.map((x) => [x.currency, x.amount]).sort()).toEqual([["GBP", 99000], ["USD", 125000]]);
    expect(full.publishedAt).not.toBeNull();
    expect(await db.auditLog.count({ where: { action: "product.create", actorId: adminId } })).toBe(1);
  });

  it("updates prices, removes sizes and keeps old URLs working via redirect", async () => {
    const p = await saveProduct(input(), adminId);
    const v = await db.productVariant.findFirstOrThrow({ where: { productId: p.id, sku: "AAV-MF-58" } });
    await saveProduct(
      input({
        id: p.id,
        slug: "the-monsoon-field-ii",
        variants: [{ id: v.id, sku: "AAV-MF-58", label: "5 × 8 ft", lengthCm: 244, widthCm: 152, stock: 5, isActive: true, prices: { USD: "1300", GBP: "", EUR: "1200", INR: "" } }],
      }),
      adminId
    );
    const prices = await db.variantPrice.findMany({ where: { variantId: v.id } });
    expect(prices.map((x) => [x.currency, x.amount]).sort()).toEqual([["EUR", 120000], ["USD", 130000]]);
    expect(await db.productVariant.count({ where: { productId: p.id } })).toBe(1);
    expect(await getRedirectForSlug("the-monsoon-field")).toBe("the-monsoon-field-ii");
  });

  it("rejects duplicate variant SKUs and publishing without any price", async () => {
    const dup = input();
    dup.variants[1].sku = "AAV-MF-58";
    await expect(saveProduct(dup, adminId)).rejects.toBeInstanceOf(AdminError);
    const unpriced = input();
    unpriced.variants.forEach((v) => (v.prices = { USD: "", GBP: "", EUR: "", INR: "" }));
    await expect(saveProduct(unpriced, adminId)).rejects.toBeInstanceOf(AdminError);
  });

  it("archives instead of deleting products that have orders", async () => {
    const p = await makeProduct();
    const order = await db.order.create({
      data: { number: "AAV-T1", email: "c@test.local", currency: "USD", subtotal: 1, shippingTotal: 0, total: 1, paymentProvider: "STRIPE" },
    });
    await db.orderItem.create({ data: { orderId: order.id, productId: p.id, productName: p.name, variantLabel: "x", sku: "x", unitAmount: 1, quantity: 1, lineTotal: 1 } });
    expect(await deleteOrArchiveProduct(p.id, adminId)).toBe("archived");
    expect((await db.product.findUniqueOrThrow({ where: { id: p.id } })).status).toBe("ARCHIVED");
    const q = await makeProduct();
    expect(await deleteOrArchiveProduct(q.id, adminId)).toBe("deleted");
  });
});

describe("catalogue search and filtering (database)", () => {
  it("filters by colour, price and availability, and sorts by price", async () => {
    const a = await makeProduct({ usd: 50000, stock: 0 });
    const b = await makeProduct({ usd: 150000 });
    await db.product.update({ where: { id: b.id }, data: { colour: "Indigo" } });
    await makeProduct({ status: "DRAFT" });

    const all = await searchProducts({ sort: "price-asc" }, "USD");
    expect(all.items.map((i) => i.id)).toEqual([a.id, b.id]); // draft excluded
    expect((await searchProducts({ colour: ["indigo"] }, "USD")).items.map((i) => i.id)).toEqual([b.id]);
    expect((await searchProducts({ maxPrice: 100000 }, "USD")).items.map((i) => i.id)).toEqual([a.id]);
    expect((await searchProducts({ inStock: true }, "USD")).items.map((i) => i.id)).toEqual([b.id]);
    expect((await searchProducts({ q: "Test Rug" }, "USD")).total).toBe(2);
  });

  it("hides sample products in production", async () => {
    const s = await makeProduct({ isSample: true });
    expect(await getProductBySlug(s.slug)).not.toBeNull();
    vi.stubEnv("NODE_ENV", "production");
    expect((await searchProducts({}, "USD")).total).toBe(0);
  });
});
