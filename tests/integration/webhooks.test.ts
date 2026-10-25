import crypto from "node:crypto";
import Stripe from "stripe";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { createPendingOrder } from "@/lib/orders";
import { processStripeEvent, verifyStripeEvent } from "@/lib/payments/stripe";
import { confirmRazorpayPayment, verifyPaymentSignature } from "@/lib/payments/razorpay";
import { availableStock } from "@/lib/inventory";
import { makeCart, makeProduct, makeShipping, resetDb } from "../helpers/db";

const stripe = new Stripe("sk_test_dummy_for_signatures");
const SECRET = "whsec_test_secret";
process.env.STRIPE_WEBHOOK_SECRET = SECRET;

function signed(event: object) {
  const payload = JSON.stringify(event);
  return { payload, header: stripe.webhooks.generateTestHeaderString({ payload, secret: SECRET }) };
}

async function pendingOrder(stock = 2) {
  const p = await makeProduct({ usd: 100000, stock });
  const cart = await makeCart(p.variants[0].id);
  const order = await createPendingOrder({ cartId: cart.id, currency: "USD", shipCountry: "US", provider: "STRIPE", email: "pending@checkout.invalid" });
  await db.payment.create({ data: { orderId: order.id, provider: "STRIPE", providerRef: `cs_${order.id}`, amount: order.total, currency: "USD" } });
  return { order, variantId: p.variants[0].id };
}

function completedEvent(orderId: string, id = "evt_1", amount = 115000) {
  return {
    id,
    object: "event",
    type: "checkout.session.completed",
    data: {
      object: {
        id: `cs_${orderId}`,
        object: "checkout.session",
        metadata: { orderId },
        client_reference_id: orderId,
        payment_status: "paid",
        payment_intent: "pi_123",
        amount_total: amount,
        currency: "usd",
        total_details: { amount_tax: 0 },
        customer_details: { email: "buyer@test.local", name: "Asha Rao", phone: null, address: { country: "US", line1: "1 Main St" } },
      },
    },
  };
}

beforeEach(async () => {
  await resetDb();
  await makeShipping();
});

describe("Stripe webhook verification", () => {
  it("accepts correctly signed payloads and rejects forged or altered ones", () => {
    const { payload, header } = signed({ id: "evt_x", object: "event", type: "ping", data: { object: {} } });
    expect(verifyStripeEvent(payload, header, stripe).id).toBe("evt_x");
    expect(() => verifyStripeEvent(payload.replace("ping", "pong"), header, stripe)).toThrow();
    expect(() => verifyStripeEvent(payload, "t=1,v1=deadbeef", stripe)).toThrow();
    expect(() => verifyStripeEvent(payload, null, stripe)).toThrow();
  });
});

describe("order lifecycle via webhooks", () => {
  it("marks the order paid, decrements stock once, and is idempotent on replay", async () => {
    const { order, variantId } = await pendingOrder(2);
    const ev = completedEvent(order.id);
    const { payload, header } = signed(ev);
    const event = verifyStripeEvent(payload, header, stripe);

    expect(await processStripeEvent(event)).toMatchObject({ status: "processed", paidOrderId: order.id });
    const paid = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(paid).toMatchObject({ paymentStatus: "PAID", email: "buyer@test.local", customerName: "Asha Rao" });
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stock).toBe(1);
    expect(await db.inventoryReservation.count({ where: { orderId: order.id, status: "CONSUMED" } })).toBe(1);

    // Replay of the same event: no double processing.
    expect((await processStripeEvent(event)).status).toBe("duplicate");
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stock).toBe(1);
    // A different event for the same session also cannot pay twice.
    expect((await processStripeEvent(verifyStripeEvent(...Object.values(signed(completedEvent(order.id, "evt_2"))) as [string, string], stripe))).paidOrderId).toBeUndefined();
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: variantId } })).stock).toBe(1);
  });

  it("does not mark an order paid when the charged amount doesn't match", async () => {
    const { order } = await pendingOrder();
    const { payload, header } = signed(completedEvent(order.id, "evt_m", 1));
    await processStripeEvent(verifyStripeEvent(payload, header, stripe));
    const o = await db.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(o.paymentStatus).toBe("PENDING");
    expect(await db.auditLog.count({ where: { action: "payment.amount_mismatch" } })).toBe(1);
  });

  it("releases reserved stock when checkout expires", async () => {
    const { order, variantId } = await pendingOrder(1);
    expect(await availableStock(db, variantId)).toBe(0);
    const expired = { ...completedEvent(order.id, "evt_exp"), type: "checkout.session.expired" };
    const { payload, header } = signed(expired);
    await processStripeEvent(verifyStripeEvent(payload, header, stripe));
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus).toBe("CANCELLED");
    expect(await availableStock(db, variantId)).toBe(1);
  });
});

describe("Razorpay payment confirmation", () => {
  it("verifies the signature and confirms the order exactly once", async () => {
    const p = await makeProduct({ stock: 2 });
    await db.shippingRate.create({ data: { zone: "IN", currency: "INR", amount: 0, label: "Test" } });
    await db.variantPrice.create({ data: { variantId: p.variants[0].id, currency: "INR", amount: 5000000 } });
    const cart = await makeCart(p.variants[0].id);
    const order = await createPendingOrder({ cartId: cart.id, currency: "INR", shipCountry: "IN", provider: "RAZORPAY", email: "c@test.local" });
    await db.payment.create({ data: { orderId: order.id, provider: "RAZORPAY", providerRef: "order_rzp_1", amount: order.total, currency: "INR" } });

    const secret = "rzp_secret";
    const sig = crypto.createHmac("sha256", secret).update("order_rzp_1|pay_1").digest("hex");
    expect(verifyPaymentSignature("order_rzp_1", "pay_1", sig, secret)).toBe(true);

    const args = { razorpayOrderId: "order_rzp_1", paymentId: "pay_1", amount: order.total, currency: "INR", eventId: "checkout:pay_1", eventType: "checkout.verified" };
    expect((await confirmRazorpayPayment(args)).status).toBe("processed");
    expect((await confirmRazorpayPayment(args)).status).toBe("duplicate");
    expect((await confirmRazorpayPayment({ ...args, eventId: "evt_webhook" })).status).toBe("processed");
    expect((await db.order.findUniqueOrThrow({ where: { id: order.id } })).paymentStatus).toBe("PAID");
    expect((await db.productVariant.findUniqueOrThrow({ where: { id: p.variants[0].id } })).stock).toBe(1);
  });
});
