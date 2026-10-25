import Stripe from "stripe";
import { db } from "@/lib/db";
import type { Order, OrderItem } from "@/lib/generated/prisma/client";
import { COUNTRY_NAMES } from "@/lib/markets";
import { absoluteUrl } from "@/lib/site";
import { isDuplicateEventError, markOrderPaid, markOrderUnpaid, recordEventOnce } from "@/lib/orders";
import { assertKeyAllowed, PaymentsConfigError } from "./config";

let client: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new PaymentsConfigError("Stripe is not configured.");
  assertKeyAllowed(key);
  if (!client) {
    // Test-only override so automated tests can run against a local mock of the Stripe API.
    const host = key.startsWith("sk_test_") ? process.env.STRIPE_API_HOST : undefined;
    client = host
      ? new Stripe(key, { host: new URL(host).hostname, port: Number(new URL(host).port), protocol: new URL(host).protocol.replace(":", "") as "http" | "https" })
      : new Stripe(key);
  }
  return client;
}

type StripeLike = Pick<Stripe, "checkout">;

export async function createStripeCheckout(
  order: Order & { items: OrderItem[] },
  shipCountry: string,
  stripe: StripeLike = getStripe()
) {
  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      client_reference_id: order.id,
      customer_email: order.email,
      line_items: order.items.map((i) => ({
        quantity: i.quantity,
        price_data: {
          currency: order.currency.toLowerCase(),
          unit_amount: i.unitAmount, // snapshot taken from the database at order creation
          product_data: { name: i.productName, description: i.variantLabel },
        },
      })),
      shipping_address_collection: {
        allowed_countries: [shipCountry as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry],
      },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            display_name: `Delivery to ${COUNTRY_NAMES[shipCountry] ?? shipCountry}`,
            fixed_amount: { amount: order.shippingTotal, currency: order.currency.toLowerCase() },
          },
        },
      ],
      // Required for India-based Stripe accounts accepting export payments.
      billing_address_collection: "required",
      phone_number_collection: { enabled: true },
      automatic_tax: { enabled: process.env.STRIPE_TAX_ENABLED === "true" },
      payment_intent_data: {
        description: `Handcrafted carpets — order ${order.number}`,
        metadata: { orderId: order.id, orderNumber: order.number },
      },
      metadata: { orderId: order.id, orderNumber: order.number },
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
      success_url: absoluteUrl(`/checkout/success?order=${order.number}`),
      cancel_url: absoluteUrl(`/checkout/cancelled?order=${order.number}`),
    },
    { idempotencyKey: `checkout-${order.id}` }
  );

  await db.payment.create({
    data: { orderId: order.id, provider: "STRIPE", providerRef: session.id, amount: order.total, currency: order.currency },
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return session.url;
}

export function verifyStripeEvent(payload: string, signature: string | null, stripe: Pick<Stripe, "webhooks"> = getStripe()) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !signature) throw new Error("Missing webhook signature or secret");
  return stripe.webhooks.constructEvent(payload, signature, secret);
}

function addressOf(details: Stripe.Checkout.Session["customer_details"] | null | undefined) {
  return details?.address ? { name: details.name, ...details.address } : null;
}

export type WebhookResult = { status: "processed" | "duplicate" | "ignored"; paidOrderId?: string };

/** Applies a verified Stripe event. Idempotent: replays are detected via PaymentEvent. */
export async function processStripeEvent(event: Stripe.Event): Promise<WebhookResult> {
  const relevant = [
    "checkout.session.completed",
    "checkout.session.async_payment_succeeded",
    "checkout.session.async_payment_failed",
    "checkout.session.expired",
    "charge.refunded",
  ];
  if (!relevant.includes(event.type)) return { status: "ignored" };

  try {
    return await db.$transaction(async (tx) => {
      if (!(await recordEventOnce(tx, "STRIPE", event.id, event.type))) return { status: "duplicate" as const };

      if (event.type === "charge.refunded") {
        const charge = event.data.object as Stripe.Charge;
        const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
        if (!pi) return { status: "ignored" as const };
        const payment = await tx.payment.findFirst({ where: { providerPaymentId: pi } });
        if (!payment) return { status: "ignored" as const };
        const full = charge.amount_refunded >= charge.amount;
        await tx.payment.update({
          where: { id: payment.id },
          data: { amountRefunded: charge.amount_refunded, status: full ? "REFUNDED" : "PARTIALLY_REFUNDED" },
        });
        if (full) await tx.order.update({ where: { id: payment.orderId }, data: { paymentStatus: "REFUNDED" } });
        return { status: "processed" as const };
      }

      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId ?? session.client_reference_id;
      if (!orderId) return { status: "ignored" as const };

      if (event.type === "checkout.session.expired") {
        await markOrderUnpaid(tx, orderId, "CANCELLED", session.id);
        return { status: "processed" as const };
      }
      if (event.type === "checkout.session.async_payment_failed") {
        await markOrderUnpaid(tx, orderId, "FAILED", session.id);
        return { status: "processed" as const };
      }
      // completed: card payments are paid immediately; delayed methods arrive via async_payment_succeeded.
      if (session.payment_status !== "paid") return { status: "processed" as const };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const s = session as any;
      const result = await markOrderPaid(tx, orderId, {
        provider: "STRIPE",
        providerRef: session.id,
        providerPaymentId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
        amount: session.amount_total ?? 0,
        currency: session.currency ?? "",
        taxAmount: session.total_details?.amount_tax ?? 0,
        email: session.customer_details?.email,
        customerName: session.customer_details?.name,
        phone: session.customer_details?.phone,
        shippingAddress: s.collected_information?.shipping_details ?? s.shipping_details ?? null,
        billingAddress: addressOf(session.customer_details),
      });
      return { status: "processed" as const, paidOrderId: result === "paid" ? orderId : undefined };
    });
  } catch (e) {
    if (isDuplicateEventError(e)) return { status: "duplicate" };
    throw e;
  }
}
