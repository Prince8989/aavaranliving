import "server-only";
import { cookies, headers } from "next/headers";
import { CURRENCY_COOKIE, SHIP_COUNTRY_COOKIE, isCountryCode, parseCurrency, suggestedCurrency } from "@/lib/markets";

/** Visitor's chosen currency (cookie), falling back to a geo-suggested default. */
export async function getCurrency() {
  const c = (await cookies()).get(CURRENCY_COOKIE)?.value;
  if (c) return parseCurrency(c);
  return suggestedCurrency((await headers()).get("x-vercel-ip-country"));
}

export async function getShipCountry(): Promise<string | null> {
  const c = (await cookies()).get(SHIP_COUNTRY_COOKIE)?.value;
  if (isCountryCode(c)) return c!.toUpperCase();
  const geo = (await headers()).get("x-vercel-ip-country");
  return isCountryCode(geo) ? geo!.toUpperCase() : null;
}
