import Stripe from "stripe";

export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key);
}

// Countries we ship to: US + EU + UK, CH, NO.
export const SHIPPING_COUNTRIES: Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[] = [
  "US", "GB", "IE", "DE", "FR", "NL", "BE", "LU", "AT", "IT", "ES", "PT", "DK",
  "SE", "FI", "PL", "CZ", "SK", "SI", "HR", "HU", "RO", "BG", "GR", "CY", "MT",
  "EE", "LV", "LT", "CH", "NO",
];
