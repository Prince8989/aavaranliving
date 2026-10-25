// Pure pricing logic — no I/O, fully unit-tested.
import type { Currency } from "@/lib/generated/prisma/enums";

export type PriceLine = { unitAmount: number; quantity: number };
export type ShippingRateLike = { amount: number; freeOverAmount: number | null; currency: Currency } | null;

export type Totals = {
  currency: Currency;
  subtotal: number;
  shipping: number | null; // null = shipping not configured for this destination
  tax: number; // tax is never estimated here; 0 unless a provider calculates it
  total: number | null;
};

export const MAX_QTY_PER_LINE = 10;

export function lineTotal(line: PriceLine): number {
  if (!Number.isInteger(line.unitAmount) || line.unitAmount < 0) throw new Error("Invalid unit amount");
  if (!Number.isInteger(line.quantity) || line.quantity < 1) throw new Error("Invalid quantity");
  return line.unitAmount * line.quantity;
}

export function subtotal(lines: PriceLine[]): number {
  return lines.reduce((sum, l) => sum + lineTotal(l), 0);
}

export function shippingCost(sub: number, rate: ShippingRateLike, currency: Currency): number | null {
  if (!rate) return null;
  if (rate.currency !== currency) throw new Error("Shipping rate currency mismatch");
  if (rate.freeOverAmount != null && sub >= rate.freeOverAmount) return 0;
  return rate.amount;
}

export function computeTotals(lines: PriceLine[], rate: ShippingRateLike, currency: Currency): Totals {
  const sub = subtotal(lines);
  const shipping = lines.length === 0 ? 0 : shippingCost(sub, rate, currency);
  return {
    currency,
    subtotal: sub,
    shipping,
    tax: 0,
    total: shipping == null ? null : sub + shipping,
  };
}

export function clampQuantity(q: number): number {
  if (!Number.isFinite(q)) return 1;
  return Math.max(1, Math.min(MAX_QTY_PER_LINE, Math.floor(q)));
}
