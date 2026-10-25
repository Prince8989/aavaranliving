import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { addToCart, CartError, loadCart, updateCartItem } from "@/lib/cart";
import { CheckoutError, createPendingOrder } from "@/lib/orders";
import { createStripeCheckout } from "@/lib/payments/stripe";
import { startCheckout } from "@/lib/checkout";
import { availableStock } from "@/lib/inventory";
import { makeCart, makeProduct, makeShipping, resetDb } from "../helpers/db";

beforeEach(async () => {
  await resetDb();
  await makeShipping();
});
afterEach(() => vi.unstubAllEnvs());

describe("cart", () => {
  it("prices every line from the database and persists across loads", async () => {
    const p = await makeProduct({ usd: 123400, stock: 3 });
    const cartId = await addToCart(null, p.variants[0].id, 2);
    const view = await loadCart(cartId, "USD", "US");
    expect(view.lines[0].unitAmount).toBe(123400);
    expect(view.totals).toMatchObject({ subtotal: 246800, shipping: 15000, total: 261800 });
    expect(view.checkoutReady).toBe(true);
    const gbp = await loadCart(cartId, "GBP", "GB");
    expect(gbp.totals.subtotal).toBe(160000);
  });

  it("prevents adding more than is available and flags unavailable lines", async () => {
    const p = await makeProduct({ stock: 1 });
    const cartId = await addToCart(null, p.variants[0].id, 1);
    await expect(addToCart(cartId, p.variants[0].id, 1)).rejects.toBeInstanceOf(CartError);
    await db.productVariant.update({ where: { id: p.variants[0].id }, data: { stock: 0 } });
    const view = await loadCart(cartId, "USD", "US");
    expect(view.lines[0].problem).toBe("Out of stock");
    expect(view.checkoutReady).toBe(false);
  });

  it("blocks checkout when a currency or destination isn't configured", async () => {
    const p = await makeProduct({ gbp: null });
    const cartId = await addToCart(null, p.variants[0].id, 1);
    expect((await loadCart(cartId, "GBP", "GB")).lines[0].problem).toMatch(/Not offered/);
    expect((await loadCart(cartId, "USD", "DE")).checkoutReady).toBe(false); // no EUR/USD rate for EU in test data
  });

  it("cannot modify items in another shopper's cart", async () => {
    const p = await makeProduct();
    const mine = await addToCart(null, p.variants[0].id, 1);
    const theirs = await addToCart(null, p.variants[0].id, 1);
    const theirItem = await db.cartItem.findFirstOrThrow({ where: { cartId: theirs } });
    await expect(updateCartItem(mine, theirItem.id, 2)).rejects.toBeInstanceOf(CartError);
  });
});

describe("order creation & inventory reservation", () => {
  it("creates a pending order with price snapshots and reserves stock", async () => {
    const p = await makeProduct({ usd: 100000, stock: 2 });
    const cart = await makeCart(p.variants[0].id, 2);
    const order = await createPendingOrder({ cartId: cart.id, currency: "USD", shipCountry: "US", provider: "STRIPE", email: "c@test.local" });
    expect(order.number).toMatch(/^AAV-\d{6}$/);
    expect(order).toMatchObject({ subtotal: 200000, shippingTotal: 15000, total: 215000, paymentStatus: "PENDING" });
    expect(order.items[0]).toMatchObject({ unitAmount: 100000, quantity: 2, lineTotal: 200000 });
    expect(await availableStock(db, p.variants[0].id)).toBe(0);
  });

  it("never sells the last unit twice under concurrent checkouts", async () => {
    const p = await makeProduct({ stock: 1 });
    const carts = await Promise.all([makeCart(p.variants[0].id), makeCart(p.variants[0].id), makeCart(p.variants[0].id)]);
    const results = await Promise.allSettled(
      carts.map((c) => createPendingOrder({ cartId: c.id, currency: "USD", shipCountry: "US", provider: "STRIPE", email: "c@test.local" }))
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    expect(rejected).toHaveLength(2);
    rejected.forEach((r) => expect(r.reason).toBeInstanceOf(CheckoutError));
  });

  it("ignores client-side tampering: price changes after carting are re-read at checkout", async () => {
    const p = await makeProduct({ usd: 100000 });
    const cart = await makeCart(p.variants[0].id);
    await db.variantPrice.update({ where: { variantId_currency: { variantId: p.variants[0].id, currency: "USD" } }, data: { amount: 110000 } });
    const order = await createPendingOrder({ cartId: cart.id, currency: "USD", shipCountry: "US", provider: "STRIPE", email: "c@test.local" });
    expect(order.subtotal).toBe(110000);
  });
});

describe("Stripe checkout session creation", () => {
  it("sends server prices, restricts the destination and records the payment", async () => {
    const p = await makeProduct({ usd: 100000 });
    const cart = await makeCart(p.variants[0].id);
    const order = await createPendingOrder({ cartId: cart.id, currency: "USD", shipCountry: "US", provider: "STRIPE", email: "c@test.local" });
    const create = vi.fn().mockResolvedValue({ id: "cs_test_123", url: "https://checkout.stripe.test/cs_test_123" });
    const url = await createStripeCheckout(order, "US", { checkout: { sessions: { create } } } as never);

    expect(url).toBe("https://checkout.stripe.test/cs_test_123");
    const [params, opts] = create.mock.calls[0];
    expect(params.line_items[0].price_data).toMatchObject({ currency: "usd", unit_amount: 100000 });
    expect(params.shipping_address_collection.allowed_countries).toEqual(["US"]);
    expect(params.shipping_options[0].shipping_rate_data.fixed_amount).toEqual({ amount: 15000, currency: "usd" });
    expect(params.billing_address_collection).toBe("required");
    expect(params.metadata.orderId).toBe(order.id);
    expect(opts.idempotencyKey).toBe(`checkout-${order.id}`);
    expect(await db.payment.findUnique({ where: { providerRef: "cs_test_123" } })).toMatchObject({ provider: "STRIPE", amount: 115000 }); // 1 × $1,000 + $150 shipping
  });

  it("refuses checkout when the provider isn't configured, and in production until launch is enabled", async () => {
    const p = await makeProduct();
    const cart = await makeCart(p.variants[0].id);
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    await expect(startCheckout({ cartId: cart.id, currency: "USD", shipCountry: "US" })).rejects.toThrow(/isn't available/);
    vi.stubEnv("NODE_ENV", "production");
    await expect(startCheckout({ cartId: cart.id, currency: "USD", shipCountry: "US" })).rejects.toThrow(/opens soon/);
    expect(await db.order.count()).toBe(0);
  });
});
