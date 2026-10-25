import { db, type Prisma } from "@/lib/db";
import type { FulfillmentStatus } from "@/lib/generated/prisma/enums";
import { audit } from "@/lib/audit";
import { deliveredEmail, shippingEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";
import { getStripe } from "@/lib/payments/stripe";
import { getRazorpay } from "@/lib/payments/razorpay";
import { AdminError } from "./products";

const ALLOWED: Record<FulfillmentStatus, FulfillmentStatus[]> = {
  UNFULFILLED: ["PROCESSING", "SHIPPED", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED", "UNFULFILLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export function canTransition(from: FulfillmentStatus, to: FulfillmentStatus) {
  return ALLOWED[from].includes(to);
}

export async function setFulfillment(orderId: string, to: FulfillmentStatus, actorId: string) {
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
  if (order.paymentStatus !== "PAID" && to !== "CANCELLED") throw new AdminError("Only paid orders can be fulfilled.");
  if (!canTransition(order.fulfillmentStatus, to)) throw new AdminError(`Cannot move from ${order.fulfillmentStatus} to ${to}.`);
  await db.order.update({ where: { id: orderId }, data: { fulfillmentStatus: to } });
  if (to === "DELIVERED") {
    await db.shipment.updateMany({ where: { orderId, deliveredAt: null }, data: { deliveredAt: new Date() } });
    await sendEmail(deliveredEmail(order));
  }
  await audit({ actorId, action: "order.fulfillment", entity: "Order", entityId: orderId, data: { from: order.fulfillmentStatus, to } });
}

export async function addShipment(orderId: string, s: { carrier: string; trackingNumber: string; trackingUrl?: string | null }, actorId: string) {
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
  if (order.paymentStatus !== "PAID") throw new AdminError("Only paid orders can be shipped.");
  if (!["UNFULFILLED", "PROCESSING", "SHIPPED"].includes(order.fulfillmentStatus)) throw new AdminError("This order can't be shipped.");
  if (s.trackingUrl && !/^https:\/\//.test(s.trackingUrl)) throw new AdminError("Tracking URL must start with https://");
  await db.$transaction([
    db.shipment.create({ data: { orderId, carrier: s.carrier, trackingNumber: s.trackingNumber, trackingUrl: s.trackingUrl || null } }),
    db.order.update({ where: { id: orderId }, data: { fulfillmentStatus: "SHIPPED" } }),
  ]);
  await audit({ actorId, action: "order.shipment", entity: "Order", entityId: orderId, data: { carrier: s.carrier, trackingNumber: s.trackingNumber } });
  await sendEmail(shippingEmail({ number: order.number, email: order.email, carrier: s.carrier, trackingNumber: s.trackingNumber, trackingUrl: s.trackingUrl || null }));
}

/**
 * Refunds go through the payment provider's API. The order is only marked refunded when the provider confirms
 * (Stripe via the charge.refunded webhook; Razorpay response recorded here).
 */
export async function refundOrder(orderId: string, amount: number, actorId: string) {
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { payments: { where: { status: { in: ["PAID", "PARTIALLY_REFUNDED"] } } } } });
  const payment = order.payments[0];
  if (!payment?.providerPaymentId) throw new AdminError("No captured payment found for this order.");
  const remaining = payment.amount - payment.amountRefunded;
  if (!Number.isInteger(amount) || amount <= 0 || amount > remaining) throw new AdminError(`Refund must be between 0 and the remaining ${remaining / 100}.`);

  await audit({ actorId, action: "refund.requested", entity: "Order", entityId: orderId, data: { amount, provider: payment.provider } });
  if (payment.provider === "STRIPE") {
    const refund = await getStripe().refunds.create({ payment_intent: payment.providerPaymentId, amount }, { idempotencyKey: `refund-${payment.id}-${payment.amountRefunded}-${amount}` });
    await audit({ actorId, action: "refund.submitted", entity: "Order", entityId: orderId, data: { refundId: refund.id, status: refund.status } });
  } else {
    const rzp = getRazorpay() as unknown as { payments: { refund(id: string, p: { amount: number }): Promise<{ id: string; status: string }> } };
    const refund = await rzp.payments.refund(payment.providerPaymentId, { amount });
    const refunded = payment.amountRefunded + amount;
    await db.payment.update({ where: { id: payment.id }, data: { amountRefunded: refunded, status: refunded >= payment.amount ? "REFUNDED" : "PARTIALLY_REFUNDED" } });
    if (refunded >= payment.amount) await db.order.update({ where: { id: orderId }, data: { paymentStatus: "REFUNDED" } });
    await audit({ actorId, action: "refund.submitted", entity: "Order", entityId: orderId, data: { refundId: refund.id, status: refund.status } });
  }
}

export function ordersCsv(
  orders: { number: string; createdAt: Date; email: string; customerName: string | null; currency: string; subtotal: number; shippingTotal: number; taxTotal: number; total: number; paymentStatus: string; fulfillmentStatus: string; shippingCountry: string | null }[]
) {
  const esc = (v: unknown) => {
    let s = v == null ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // neutralise spreadsheet formula injection
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ["Order", "Date", "Email", "Customer", "Currency", "Subtotal", "Shipping", "Tax", "Total", "Payment", "Fulfilment", "Country"];
  const rows = orders.map((o) =>
    [o.number, o.createdAt.toISOString(), o.email, o.customerName, o.currency, o.subtotal / 100, o.shippingTotal / 100, o.taxTotal / 100, o.total / 100, o.paymentStatus, o.fulfillmentStatus, o.shippingCountry]
      .map(esc)
      .join(",")
  );
  return [header.join(","), ...rows].join("\n");
}

const FILTERS: Record<string, Prisma.OrderWhereInput> = {
  pending_payment: { paymentStatus: "PENDING" },
  paid: { paymentStatus: "PAID", fulfillmentStatus: "UNFULFILLED" },
  processing: { paymentStatus: "PAID", fulfillmentStatus: "PROCESSING" },
  shipped: { fulfillmentStatus: "SHIPPED" },
  delivered: { fulfillmentStatus: "DELIVERED" },
  cancelled: { OR: [{ paymentStatus: { in: ["CANCELLED", "FAILED"] } }, { fulfillmentStatus: "CANCELLED" }] },
  refunded: { paymentStatus: { in: ["REFUNDED", "PARTIALLY_REFUNDED"] } },
};

export function orderWhere(q?: string, status?: string): Prisma.OrderWhereInput {
  return {
    ...(q ? { OR: [{ number: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }, { customerName: { contains: q, mode: "insensitive" } }] } : {}),
    ...(status && FILTERS[status] ? FILTERS[status] : {}),
  };
}

