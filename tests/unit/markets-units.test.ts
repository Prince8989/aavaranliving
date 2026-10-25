import { afterEach, describe, expect, it } from "vitest";
import { isCountryCode, parseCurrency, suggestedCurrency, zoneForCountry } from "@/lib/markets";
import { areaM2, cmToFeetInches, feetToCm, formatDimensions, formatWeight } from "@/lib/units";
import { assertKeyAllowed, isLiveKey, providerForCurrency } from "@/lib/payments/config";

describe("markets", () => {
  it("maps countries to shipping zones", () => {
    expect(zoneForCountry("US")).toBe("US");
    expect(zoneForCountry("gb")).toBe("UK");
    expect(zoneForCountry("DE")).toBe("EU");
    expect(zoneForCountry("IN")).toBe("IN");
    expect(zoneForCountry("CH")).toBeNull();
    expect(zoneForCountry(null)).toBeNull();
  });

  it("suggests a currency but never forces one", () => {
    expect(suggestedCurrency("FR")).toBe("EUR");
    expect(suggestedCurrency("GB")).toBe("GBP");
    expect(suggestedCurrency("IN")).toBe("INR");
    expect(suggestedCurrency("JP")).toBe("USD");
  });

  it("only accepts supported currencies and countries", () => {
    expect(parseCurrency("gbp")).toBe("GBP");
    expect(parseCurrency("JPY")).toBe("USD");
    expect(isCountryCode("NL")).toBe(true);
    expect(isCountryCode("XX")).toBe(false);
  });
});

describe("metric conversions", () => {
  it("converts feet to centimetres exactly (1 ft = 30.48 cm)", () => {
    expect(feetToCm(5)).toBe(152);
    expect(feetToCm(8)).toBe(244);
    expect(feetToCm(9)).toBe(274);
    expect(feetToCm(12)).toBe(366);
  });

  it("formats imperial and metric dimensions", () => {
    expect(cmToFeetInches(244)).toBe("8′ 0″");
    expect(cmToFeetInches(152)).toBe("5′ 0″");
    expect(formatDimensions(244, 152)).toBe("5′ 0″ × 8′ 0″ (152 × 244 cm)");
    expect(formatWeight(12000)).toBe("12.0 kg (26.5 lb)");
    expect(formatWeight(null)).toBeNull();
    expect(areaM2(244, 152)).toBeCloseTo(3.71, 2);
  });
});

describe("payment provider routing", () => {
  const original = { ...process.env };
  afterEach(() => {
    process.env = { ...original };
  });

  it("routes INR to Razorpay and international currencies to Stripe by default", () => {
    delete process.env.PAYMENT_ROUTING;
    expect(providerForCurrency("USD")).toBe("STRIPE");
    expect(providerForCurrency("EUR")).toBe("STRIPE");
    expect(providerForCurrency("INR")).toBe("RAZORPAY");
  });

  it("can be reconfigured to match merchant eligibility", () => {
    process.env.PAYMENT_ROUTING = "USD:RAZORPAY,INR:STRIPE";
    expect(providerForCurrency("USD")).toBe("RAZORPAY");
    expect(providerForCurrency("INR")).toBe("STRIPE");
    expect(providerForCurrency("GBP")).toBe("STRIPE");
  });

  it("refuses live keys unless live mode is explicitly enabled", () => {
    expect(isLiveKey("sk_live_abc")).toBe(true);
    expect(isLiveKey("rzp_live_abc")).toBe(true);
    expect(isLiveKey("sk_test_abc")).toBe(false);
    delete process.env.PAYMENTS_LIVE_MODE;
    expect(() => assertKeyAllowed("sk_live_abc")).toThrow();
    expect(() => assertKeyAllowed("sk_test_abc")).not.toThrow();
    process.env.PAYMENTS_LIVE_MODE = "true";
    expect(() => assertKeyAllowed("sk_live_abc")).not.toThrow();
  });
});
