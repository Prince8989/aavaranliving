import type { Currency } from "@/lib/generated/prisma/enums";

export const CURRENCIES = ["USD", "GBP", "EUR", "INR"] as const satisfies readonly Currency[];
export const DEFAULT_CURRENCY: Currency = "USD";
export const CURRENCY_COOKIE = "aav_currency";
export const SHIP_COUNTRY_COOKIE = "aav_ship_to";

export const CURRENCY_META: Record<Currency, { symbol: string; label: string; locale: string }> = {
  USD: { symbol: "$", label: "US Dollar", locale: "en-US" },
  GBP: { symbol: "£", label: "Pound Sterling", locale: "en-GB" },
  EUR: { symbol: "€", label: "Euro", locale: "en-IE" },
  INR: { symbol: "₹", label: "Indian Rupee", locale: "en-IN" },
};

export type Zone = "US" | "UK" | "EU" | "IN";

export const EU_COUNTRIES = [
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE",
  "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
] as const;

export const COUNTRY_NAMES: Record<string, string> = {
  US: "United States", GB: "United Kingdom", IN: "India",
  AT: "Austria", BE: "Belgium", BG: "Bulgaria", HR: "Croatia", CY: "Cyprus", CZ: "Czechia",
  DK: "Denmark", EE: "Estonia", FI: "Finland", FR: "France", DE: "Germany", GR: "Greece",
  HU: "Hungary", IE: "Ireland", IT: "Italy", LV: "Latvia", LT: "Lithuania", LU: "Luxembourg",
  MT: "Malta", NL: "Netherlands", PL: "Poland", PT: "Portugal", RO: "Romania", SK: "Slovakia",
  SI: "Slovenia", ES: "Spain", SE: "Sweden",
};

export const SHIPPABLE_COUNTRIES = Object.keys(COUNTRY_NAMES).sort((a, b) =>
  COUNTRY_NAMES[a].localeCompare(COUNTRY_NAMES[b])
);

export function zoneForCountry(country: string | null | undefined): Zone | null {
  if (!country) return null;
  const c = country.toUpperCase();
  if (c === "US") return "US";
  if (c === "GB") return "UK";
  if (c === "IN") return "IN";
  if ((EU_COUNTRIES as readonly string[]).includes(c)) return "EU";
  return null;
}

/** Suggested currency for a visitor's country. Used only as a default; the visitor can always change it. */
export function suggestedCurrency(country: string | null | undefined): Currency {
  const zone = zoneForCountry(country);
  return zone === "UK" ? "GBP" : zone === "EU" ? "EUR" : zone === "IN" ? "INR" : "USD";
}

export function parseCurrency(value: string | null | undefined): Currency {
  const v = value?.toUpperCase();
  return (CURRENCIES as readonly string[]).includes(v ?? "") ? (v as Currency) : DEFAULT_CURRENCY;
}

export function isCountryCode(value: string | null | undefined): value is string {
  return !!value && SHIPPABLE_COUNTRIES.includes(value.toUpperCase());
}

/**
 * Tax & duty disclosure per zone. These are disclosures, not calculations: no tax is
 * hardcoded. Confirm with your accountant and enable Stripe Tax (STRIPE_TAX_ENABLED) if needed.
 */
export const TAX_DISCLOSURE: Record<Zone, string> = {
  US: "Sales tax, where applicable, is shown at payment. Import duties are not prepaid and may be payable by the recipient.",
  UK: "VAT and import charges are not prepaid and may be payable by the recipient on delivery.",
  EU: "VAT and import charges are not prepaid and may be payable by the recipient on delivery.",
  IN: "Applicable taxes are shown at payment.",
};
