import crypto from "node:crypto";
import Razorpay from "razorpay";
import { db } from "@/lib/db";
import type { Order } from "@/lib/generated/prisma/client";
import { isDuplicateEventError, markOrderPaid, recordEventOnce } from "@/lib/orders";
import { assertKeyAllowed, PaymentsConfigError } from "./config";

type RazorpayOrdersApi = { orders: { create(params: Record<string, unknown>): Promise<{ id: string; amount: number | string; currency: string }> } };

export function getRazorpay(): RazorpayOrdersApi {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) throw new PaymentsConfigError("Razorpay is not configured.");
  assertKeyAllowed(key_id);
  return new Razorpay({ key_id, key_secret }) as unknown as RazorpayOrdersApi;
}

export async function createRazorpayOrder(order: Order, rzp: RazorpayOrdersApi = getRazorpay()) {
  const created = await rzp.orders.create({
    amount: order.total, // paise
    currency: order.currency,
    receipt: order.number,
    notes: { orderId: order.id, orderNumber: order.number },
  });
  await db.payment.create({
    data: { orderId: order.id, provider: "RAZORPAY", providerRef: created.id, amount: order.total, currency: order.currency },
  });
  return created;
}

function safeEqualHex(a: string, b: string) {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

/** Checkout handler signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret). */
export function verifyPaymentSignature(razorpayOrderId: string, paymentId: string, signature: string, secret = process.env.RAZORPAY_KEY_SECRET ?? "") {
  if (!secret) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${razorpayOrderId}|${paymentId}`).digest("hex");
  return safeEqualHex(expected, signature);
}

/** Webhook signature: HMAC_SHA256(raw body, webhook secret). */
export function verifyWebhookSignature(rawBody: string, signature: string | null, secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? "") {
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}

/** Marks the order paid after a verified checkout callback or webhook. Idempotent. */
export async function confirmRazorpayPayment(params: { razorpayOrderId: string; paymentId: string; amount: number; currency: string; eventId: string; eventType: string }) {
  const payment = await db.payment.findUnique({ where: { providerRef: params.razorpayOrderId } });
  if (!payment) return { status: "ignored" as const };
  try {
    return await db.$transaction(async (tx) => {
      if (!(await recordEventOnce(tx, "RAZORPAY", params.eventId, params.eventType))) return { status: "duplicate" as const };
      const result = await markOrderPaid(tx, payment.orderId, {
        provider: "RAZORPAY",
        providerRef: params.razorpayOrderId,
        providerPaymentId: params.paymentId,
        amount: params.amount,
        currency: params.currency,
      });
      return { status: "processed" as const, paidOrderId: result === "paid" ? payment.orderId : undefined };
    });
  } catch (e) {
    if (isDuplicateEventError(e)) return { status: "duplicate" as const };
    throw e;
  }
}
