import { db, type Tx } from "@/lib/db";

export const RESERVATION_MINUTES = 35; // slightly longer than the 30-minute Stripe session

/** Pure check used by cart and checkout. */
export function hasSufficientStock(available: number, requested: number) {
  return Number.isInteger(requested) && requested > 0 && available >= requested;
}

/** Units currently held by unexpired, active reservations (optionally excluding one order). */
export async function reservedQuantity(client: Tx | typeof db, variantId: string, excludeOrderId?: string) {
  const agg = await client.inventoryReservation.aggregate({
    _sum: { quantity: true },
    where: {
      variantId,
      status: "ACTIVE",
      expiresAt: { gt: new Date() },
      ...(excludeOrderId ? { orderId: { not: excludeOrderId } } : {}),
    },
  });
  return agg._sum.quantity ?? 0;
}

export async function availableStock(client: Tx | typeof db, variantId: string) {
  const v = await client.productVariant.findUnique({ where: { id: variantId }, select: { stock: true } });
  if (!v) return 0;
  return Math.max(0, v.stock - (await reservedQuantity(client, variantId)));
}

/** Batch availability for many variants (one query each for stock and reservations). */
export async function availabilityMap(variantIds: string[]) {
  if (variantIds.length === 0) return new Map<string, number>();
  const [variants, reservations] = await Promise.all([
    db.productVariant.findMany({ where: { id: { in: variantIds } }, select: { id: true, stock: true } }),
    db.inventoryReservation.groupBy({
      by: ["variantId"],
      _sum: { quantity: true },
      where: { variantId: { in: variantIds }, status: "ACTIVE", expiresAt: { gt: new Date() } },
    }),
  ]);
  const held = new Map(reservations.map((r) => [r.variantId, r._sum.quantity ?? 0]));
  return new Map(variants.map((v) => [v.id, Math.max(0, v.stock - (held.get(v.id) ?? 0))]));
}

/**
 * Locks the variant rows for the rest of the transaction so concurrent checkouts
 * cannot both reserve the last unit.
 */
export async function lockVariants(tx: Tx, variantIds: string[]) {
  const ids = [...new Set(variantIds)].sort(); // consistent lock order avoids deadlocks
  for (const id of ids) {
    await tx.$queryRaw`SELECT "id" FROM "ProductVariant" WHERE "id" = ${id} FOR UPDATE`;
  }
}

export async function reserve(tx: Tx, orderId: string, lines: { variantId: string; quantity: number }[]) {
  const expiresAt = new Date(Date.now() + RESERVATION_MINUTES * 60_000);
  await tx.inventoryReservation.createMany({
    data: lines.map((l) => ({ orderId, variantId: l.variantId, quantity: l.quantity, expiresAt })),
  });
}

export async function releaseForOrder(tx: Tx, orderId: string) {
  await tx.inventoryReservation.updateMany({
    where: { orderId, status: "ACTIVE" },
    data: { status: "RELEASED" },
  });
}

/**
 * Converts an order's reservations into a permanent stock decrement.
 * Uses a conditional UPDATE so stock can never go negative; returns any lines that could not be fulfilled.
 */
export async function consumeForOrder(tx: Tx, orderId: string, lines: { variantId: string; quantity: number }[]) {
  const shortfalls: { variantId: string; quantity: number }[] = [];
  for (const line of lines) {
    const updated = await tx.$executeRaw`
      UPDATE "ProductVariant" SET "stock" = "stock" - ${line.quantity}, "updatedAt" = NOW()
      WHERE "id" = ${line.variantId} AND "stock" >= ${line.quantity}`;
    if (updated === 0) shortfalls.push(line);
  }
  await tx.inventoryReservation.updateMany({
    where: { orderId, status: { in: ["ACTIVE", "RELEASED"] } },
    data: { status: "CONSUMED" },
  });
  return shortfalls;
}

/** Housekeeping: mark expired active reservations as released. Safe to call any time. */
export async function releaseExpiredReservations() {
  return db.inventoryReservation.updateMany({
    where: { status: "ACTIVE", expiresAt: { lte: new Date() } },
    data: { status: "RELEASED" },
  });
}
