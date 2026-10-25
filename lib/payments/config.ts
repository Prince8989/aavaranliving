import type { Currency, PaymentProvider } from "@/lib/generated/prisma/enums";

const DEFAULT_ROUTING: Record<Currency, PaymentProvider> = {
  USD: "STRIPE",
  GBP: "STRIPE",
  EUR: "STRIPE",
  INR: "RAZORPAY",
};

/**
 * Which provider settles which currency. Override with e.g. PAYMENT_ROUTING="USD:STRIPE,INR:RAZORPAY".
 * Displaying a currency does not imply a provider can settle it — routing must match your merchant accounts.
 */
export function providerForCurrency(currency: Currency): PaymentProvider {
  const raw = process.env.PAYMENT_ROUTING;
  if (raw) {
    for (const pair of raw.split(",")) {
      const [c, p] = pair.split(":").map((s) => s.trim().toUpperCase());
      if (c === currency && (p === "STRIPE" || p === "RAZORPAY")) return p;
    }
  }
  return DEFAULT_ROUTING[currency];
}

export function isLiveKey(key: string | undefined | null) {
  return !!key && /^(sk_live_|rk_live_|rzp_live_)/.test(key);
}

export class PaymentsConfigError extends Error {}

/** Live keys are refused unless PAYMENTS_LIVE_MODE=true is set deliberately. */
export function assertKeyAllowed(key: string | undefined | null) {
  if (isLiveKey(key) && process.env.PAYMENTS_LIVE_MODE !== "true") {
    throw new PaymentsConfigError("Live payment keys are configured but PAYMENTS_LIVE_MODE is not enabled.");
  }
}

export function isProviderConfigured(provider: PaymentProvider): boolean {
  if (provider === "STRIPE") return !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_WEBHOOK_SECRET;
  return !!process.env.RAZORPAY_KEY_ID && !!process.env.RAZORPAY_KEY_SECRET && !!process.env.RAZORPAY_WEBHOOK_SECRET;
}
