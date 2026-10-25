import { db, Prisma, type Tx } from "@/lib/db";
import type { Currency, PaymentProvider, PaymentStatus, FulfillmentStatus } from "@/lib/generated/prisma/enums";
import { consumeForOrder, lockVariants, releaseExpiredReservations, releaseForOrder, reservedQuantity, reserve } from "@/lib/inventory";
import { zoneForCountry } from "@/lib/markets";
import { computeTotals } from "@/lib/pricing";
import { sampleProductsVisible } from "@/lib/site";
import { audit } from "@/lib/audit";

export class CheckoutError extends Error {}

export function formatOrderNumber(seq: number) {
  return `AAV-${String(seq).padStart(6, "0")}`;
}

export type DisplayStatus =
  | "Pending Payment" | "Paid" | "Processing" | "Shipped" | "Delivered" | "Cancelled" | "Refunded";

/** Payment and fulfilment are stored separately; this derives the customer-facing status. */
export function displayStatus(payment: PaymentStatus, fulfillment: FulfillmentStatus): DisplayStatus {
  if (payment === "REFUNDED") return "Refunded";
  if (fulfillment === "CANCELLED" || payment === "CANCELLED" || payment === "FAILED") return "Cancelled";
  if (payment === "PENDING") return "Pending Payment";
  if (fulfillment === "DELIVERED") return "Delivered";
  if (fulfillment === "SHIPPED") return "Shipped";
  if (fulfillment === "PROCESSING") return "Processing";
  return "Paid";
}

type CreateOrderInput = {
  cartId: string;
  currency: Currency;
  shipCountry: string;
  provider: PaymentProvider;
  email: string;
  userId?: string | null;
  customerName?: string | null;
  phone?: string | null;
  shippingAddress?: Record<string, unknown> | null;
};

/**
 * Creates a PENDING_PAYMENT order from the cart, re-pricing everything from the database
 * and reserving inventory under row locks so the last unit cannot be sold twice.
 */
export async function createPendingOrder(input: CreateOrderInput) {
  await releaseExpiredReservations();
  const zone = zoneForCountry(input.shipCountry);
  if (!zone) throw new CheckoutError("We don't deliver to this destination online yet.");

  return db.$transaction(async (tx) => {
    const items = await tx.cartItem.findMany({
      where: { cartId: input.cartId },
      include: { variant: { include: { prices: true, product: true } } },
    });
    if (items.length === 0) throw new CheckoutError("Your bag is empty.");

    await lockVariants(tx, items.map((i) => i.variantId));

    const lines = [];
    for (const item of items) {
      const v = item.variant;
      const sellable = v.isActive && v.product.status === "PUBLISHED" && (!v.product.isSample || sampleProductsVisible());
      if (!sellable) throw new CheckoutError(`${v.product.name} is no longer available.`);
      const price = v.prices.find((p) => p.currency === input.currency)?.amount;
      if (price == null) throw new CheckoutError(`${v.product.name} isn't offered in ${input.currency}.`);
      const fresh = await tx.productVariant.findUniqueOrThrow({ where: { id: v.id }, select: { stock: true } });
      const available = fresh.stock - (await reservedQuantity(tx, v.id));
      if (available < item.quantity) {
        throw new CheckoutError(
          available <= 0 ? `${v.product.name} (${v.label}) is out of stock.` : `Only ${available} of ${v.product.name} (${v.label}) available.`
        );
      }
      lines.push({ variant: v, quantity: item.quantity, unitAmount: price });
    }

    const rate = await tx.shippingRate.findFirst({ where: { zone, currency: input.currency, isActive: true } });
    const totals = computeTotals(lines.map((l) => ({ unitAmount: l.unitAmount, quantity: l.quantity })), rate, input.currency);
    if (totals.shipping == null || totals.total == null) throw new CheckoutError("Shipping to this destination isn't configured.");

    const [{ nextval }] = await tx.$queryRaw<{ nextval: bigint }[]>`SELECT nextval(pg_get_serial_sequence('"Order"', 'seq'))`;
    const seq = Number(nextval);

    const order = await tx.order.create({
      data: {
        seq,
        number: formatOrderNumber(seq),
        userId: input.userId ?? null,
        email: input.email,
        customerName: input.customerName ?? null,
        phone: input.phone ?? null,
        currency: input.currency,
        subtotal: totals.subtotal,
        shippingTotal: totals.shipping,
        taxTotal: 0,
        total: totals.total,
        paymentProvider: input.provider,
        shippingCountry: input.shipCountry,
        shippingAddress: input.shippingAddress ? (input.shippingAddress as Prisma.InputJsonValue) : undefined,
        items: {
          create: lines.map((l) => ({
            productId: l.variant.productId,
            variantId: l.variant.id,
            productName: l.variant.product.name,
            variantLabel: l.variant.label,
            sku: l.variant.sku,
            unitAmount: l.unitAmount,
            quantity: l.quantity,
            lineTotal: l.unitAmount * l.quantity,
          })),
        },
      },
      include: { items: true },
    });

    await reserve(tx, order.id, lines.map((l) => ({ variantId: l.variant.id, quantity: l.quantity })));
    return order;
  });
}

export type PaidDetails = {
  provider: PaymentProvider;
  providerRef: string;
  providerPaymentId?: string | null;
  amount: number; // amount actually charged, minor units
  currency: string;
  taxAmount?: number;
  email?: string | null;
  customerName?: string | null;
  phone?: string | null;
  shippingAddress?: unknown;
  billingAddress?: unknown;
};

/**
 * Idempotently marks an order paid, consumes its reservations and decrements stock.
 * Returns "paid" if this call transitioned the order, "already" if it was already paid,
 * "mismatch" if the charged amount doesn't match (order held for manual review).
 */
export async function markOrderPaid(tx: Tx, orderId: string, d: PaidDetails): Promise<"paid" | "already" | "mismatch"> {
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  if (order.paymentStatus === "PAID") return "already";

  const tax = d.taxAmount ?? 0;
  const expected = order.subtotal + order.shippingTotal;
  if (d.currency.toUpperCase() !== order.currency || d.amount - tax !== expected) {
    await audit(
      { action: "payment.amount_mismatch", entity: "Order", entityId: order.id, data: { expected, charged: d.amount, tax, currency: d.currency } },
      tx
    );
    await tx.order.update({ where: { id: order.id }, data: { notes: "Payment amount mismatch — review before fulfilment." } });
    return "mismatch";
  }

  await tx.payment.upsert({
    where: { providerRef: d.providerRef },
    create: {
      orderId: order.id,
      provider: d.provider,
      providerRef: d.providerRef,
      providerPaymentId: d.providerPaymentId ?? null,
      amount: d.amount,
      currency: order.currency,
      status: "PAID",
    },
    update: { status: "PAID", providerPaymentId: d.providerPaymentId ?? undefined, amount: d.amount },
  });

  const shortfalls = await consumeForOrder(
    tx,
    order.id,
    order.items.filter((i) => i.variantId).map((i) => ({ variantId: i.variantId!, quantity: i.quantity }))
  );

  await tx.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: "PAID",
      paidAt: new Date(),
      taxTotal: tax,
      total: d.amount,
      email: d.email ?? order.email,
      customerName: d.customerName ?? order.customerName,
      phone: d.phone ?? order.phone,
      shippingAddress: d.shippingAddress ? (d.shippingAddress as Prisma.InputJsonValue) : undefined,
      billingAddress: d.billingAddress ? (d.billingAddress as Prisma.InputJsonValue) : undefined,
      notes: shortfalls.length ? "Stock shortfall at payment — confirm availability before fulfilment." : order.notes,
    },
  });
  if (shortfalls.length) {
    await audit({ action: "inventory.shortfall", entity: "Order", entityId: order.id, data: shortfalls }, tx);
  }
  return "paid";
}

/** Payment failed or checkout expired: release the hold. Never touches an already-paid order. */
export async function markOrderUnpaid(tx: Tx, orderId: string, status: "FAILED" | "CANCELLED", providerRef?: string) {
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
  if (order.paymentStatus !== "PENDING") return false;
  await releaseForOrder(tx, orderId);
  await tx.order.update({
    where: { id: orderId },
    data: { paymentStatus: status, cancelledAt: new Date() },
  });
  if (providerRef) await tx.payment.updateMany({ where: { providerRef }, data: { status } });
  return true;
}

/**
 * Records a processed webhook event inside the processing transaction. Returns false if it was
 * already processed (replay). A concurrent duplicate hits the unique constraint, rolls back, and
 * is reported as a duplicate by isDuplicateEventError().
 */
export async function recordEventOnce(tx: Tx, provider: PaymentProvider, eventId: string, type: string) {
  const seen = await tx.paymentEvent.findUnique({ where: { provider_eventId: { provider, eventId } } });
  if (seen) return false;
  await tx.paymentEvent.create({ data: { provider, eventId, type } });
  return true;
}

export function isDuplicateEventError(e: unknown) {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}
