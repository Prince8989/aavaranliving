import type { Currency } from "@/lib/generated/prisma/enums";
import { CURRENCY_META } from "@/lib/markets";

/** All supported currencies use 2 decimal minor units. */
export function formatMoney(minor: number, currency: Currency): string {
  return new Intl.NumberFormat(CURRENCY_META[currency].locale, {
    style: "currency",
    currency,
    minimumFractionDigits: minor % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(minor / 100);
}

/** Parse a decimal string ("1299.50") into integer minor units without float drift. */
export function toMinorUnits(input: string | number): number {
  const s = String(input).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(s)) throw new Error(`Invalid amount: ${input}`);
  const [whole, frac = ""] = s.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

export function fromMinorUnits(minor: number): string {
  return (minor / 100).toFixed(2);
}
