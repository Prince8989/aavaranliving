import { db } from "@/lib/db";
import type { Currency } from "@/lib/generated/prisma/enums";
import { availabilityMap } from "@/lib/inventory";
import { zoneForCountry, type Zone } from "@/lib/markets";
import { computeTotals, MAX_QTY_PER_LINE, type Totals } from "@/lib/pricing";
import { sampleProductsVisible } from "@/lib/site";

export const CART_COOKIE = "aav_cart";

export type CartLine = {
  itemId: string;
  variantId: string;
  productId: string;
  productSlug: string;
  productName: string;
  variantLabel: string;
  sku: string;
  image: { url: string; alt: string } | null;
  quantity: number;
  unitAmount: number | null;
  lineTotal: number | null;
  available: number;
  problem: string | null;
};

export type CartView = {
  id: string | null;
  currency: Currency;
  shipCountry: string | null;
  zone: Zone | null;
  lines: CartLine[];
  count: number;
  totals: Totals;
  shippingLabel: string | null;
  problems: string[];
  checkoutReady: boolean;
};

export class CartError extends Error {}

function variantIsSellable(v: { isActive: boolean; product: { status: string; isSample: boolean } }) {
  return v.isActive && v.product.status === "PUBLISHED" && (!v.product.isSample || sampleProductsVisible());
}

/** Builds a cart view with every price recalculated from the database. Client prices are never used. */
export async function loadCart(cartId: string | null, currency: Currency, shipCountry: string | null): Promise<CartView> {
  const cart = cartId
    ? await db.cart.findUnique({
        where: { id: cartId },
        include: {
          items: {
            orderBy: { createdAt: "asc" },
            include: {
              variant: {
                include: {
                  prices: true,
                  product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } },
                },
              },
            },
          },
        },
      })
    : null;

  const items = cart?.items ?? [];
  const availability = await availabilityMap(items.map((i) => i.variantId));
  const problems: string[] = [];

  const lines: CartLine[] = items.map((item) => {
    const v = item.variant;
    const price = v.prices.find((p) => p.currency === currency)?.amount ?? null;
    const available = availability.get(v.id) ?? 0;
    let problem: string | null = null;
    if (!variantIsSellable(v)) problem = "No longer available";
    else if (price == null) problem = `Not offered in ${currency}`;
    else if (available < item.quantity) problem = available === 0 ? "Out of stock" : `Only ${available} available`;
    if (problem) problems.push(`${v.product.name} (${v.label}): ${problem}`);
    return {
      itemId: item.id,
      variantId: v.id,
      productId: v.productId,
      productSlug: v.product.slug,
      productName: v.product.name,
      variantLabel: v.label,
      sku: v.sku,
      image: v.product.images[0] ? { url: v.product.images[0].url, alt: v.product.images[0].alt } : null,
      quantity: item.quantity,
      unitAmount: price,
      lineTotal: price == null ? null : price * item.quantity,
      available,
      problem,
    };
  });

  const zone = zoneForCountry(shipCountry);
  const rate = zone
    ? await db.shippingRate.findFirst({ where: { zone, currency, isActive: true } })
    : null;
  const priced = lines.filter((l) => l.unitAmount != null).map((l) => ({ unitAmount: l.unitAmount!, quantity: l.quantity }));
  const totals = computeTotals(priced, rate, currency);

  if (lines.length > 0 && !zone) problems.push("Choose a delivery country to see shipping and continue.");
  else if (lines.length > 0 && totals.shipping == null)
    problems.push("Shipping to this destination isn't available online yet. Please contact us to arrange delivery.");

  return {
    id: cart?.id ?? null,
    currency,
    shipCountry,
    zone,
    lines,
    count: lines.reduce((n, l) => n + l.quantity, 0),
    totals,
    shippingLabel: rate?.label ?? null,
    problems,
    checkoutReady: lines.length > 0 && problems.length === 0,
  };
}

async function sellableVariant(variantId: string) {
  const v = await db.productVariant.findUnique({
    where: { id: variantId },
    include: { product: { select: { status: true, isSample: true } } },
  });
  if (!v || !variantIsSellable(v)) throw new CartError("This item is not available.");
  return v;
}

/** Adds a variant. Returns the cart id (a new cart is created when needed). */
export async function addToCart(cartId: string | null, variantId: string, quantity: number, userId?: string | null) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY_PER_LINE) throw new CartError("Invalid quantity.");
  await sellableVariant(variantId);

  let cart = cartId ? await db.cart.findUnique({ where: { id: cartId } }) : null;
  if (!cart) cart = await db.cart.create({ data: { userId: userId ?? null } });

  const existing = await db.cartItem.findUnique({ where: { cartId_variantId: { cartId: cart.id, variantId } } });
  const next = Math.min(MAX_QTY_PER_LINE, (existing?.quantity ?? 0) + quantity);
  const available = (await availabilityMap([variantId])).get(variantId) ?? 0;
  if (available < next) throw new CartError(available === 0 ? "This size is out of stock." : `Only ${available} available.`);

  await db.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
    create: { cartId: cart.id, variantId, quantity: next },
    update: { quantity: next },
  });
  return cart.id;
}

export async function updateCartItem(cartId: string, itemId: string, quantity: number) {
  const item = await db.cartItem.findFirst({ where: { id: itemId, cartId } }); // scoped to this cart (no IDOR)
  if (!item) throw new CartError("Item not found.");
  if (quantity <= 0) {
    await db.cartItem.delete({ where: { id: item.id } });
    return;
  }
  if (!Number.isInteger(quantity) || quantity > MAX_QTY_PER_LINE) throw new CartError("Invalid quantity.");
  const available = (await availabilityMap([item.variantId])).get(item.variantId) ?? 0;
  if (available < quantity) throw new CartError(`Only ${available} available.`);
  await db.cartItem.update({ where: { id: item.id }, data: { quantity } });
}

export async function removeCartItem(cartId: string, itemId: string) {
  await db.cartItem.deleteMany({ where: { id: itemId, cartId } });
}

export async function clearCart(cartId: string) {
  await db.cartItem.deleteMany({ where: { cartId } });
}
