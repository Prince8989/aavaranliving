import type { Currency } from "./types";

export const CURRENCY_COOKIE = "currency";

export function parseCurrency(value: string | undefined | null): Currency {
  return value === "eur" ? "eur" : "usd";
}

export function formatPrice(cents: number, currency: Currency): string {
  return new Intl.NumberFormat(currency === "eur" ? "de-DE" : "en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export function priceFor(p: { price_usd: number; price_eur: number }, currency: Currency) {
  return currency === "eur" ? p.price_eur : p.price_usd;
}
