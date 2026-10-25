import { describe, expect, it } from "vitest";
import { clampQuantity, computeTotals, lineTotal, shippingCost, subtotal } from "@/lib/pricing";
import { formatMoney, fromMinorUnits, toMinorUnits } from "@/lib/money";

describe("price calculations", () => {
  it("computes line totals and subtotals in integer minor units", () => {
    expect(lineTotal({ unitAmount: 129950, quantity: 2 })).toBe(259900);
    expect(subtotal([{ unitAmount: 100, quantity: 3 }, { unitAmount: 250, quantity: 1 }])).toBe(550);
  });

  it("rejects invalid quantities and amounts", () => {
    expect(() => lineTotal({ unitAmount: 100, quantity: 0 })).toThrow();
    expect(() => lineTotal({ unitAmount: 100, quantity: 1.5 })).toThrow();
    expect(() => lineTotal({ unitAmount: -1, quantity: 1 })).toThrow();
    expect(() => lineTotal({ unitAmount: 10.5, quantity: 1 })).toThrow();
  });

  it("clamps quantities to the allowed range", () => {
    expect(clampQuantity(0)).toBe(1);
    expect(clampQuantity(99)).toBe(10);
    expect(clampQuantity(NaN)).toBe(1);
  });
});

describe("shipping calculations", () => {
  const rate = { amount: 15000, freeOverAmount: 500000, currency: "USD" as const };

  it("charges the flat rate below the threshold and nothing above it", () => {
    expect(shippingCost(100000, rate, "USD")).toBe(15000);
    expect(shippingCost(500000, rate, "USD")).toBe(0);
  });

  it("returns null when no rate is configured (no silent free shipping)", () => {
    expect(shippingCost(100000, null, "USD")).toBeNull();
    const t = computeTotals([{ unitAmount: 1000, quantity: 1 }], null, "USD");
    expect(t.shipping).toBeNull();
    expect(t.total).toBeNull();
  });

  it("refuses a rate in a different currency", () => {
    expect(() => shippingCost(100, rate, "GBP")).toThrow();
  });

  it("builds totals with tax left at zero (never estimated)", () => {
    const t = computeTotals([{ unitAmount: 100000, quantity: 2 }], rate, "USD");
    expect(t).toEqual({ currency: "USD", subtotal: 200000, shipping: 15000, tax: 0, total: 215000 });
  });

  it("an empty cart has zero shipping", () => {
    expect(computeTotals([], rate, "USD").total).toBe(0);
  });
});

describe("currency handling", () => {
  it("parses decimal strings to minor units without float drift", () => {
    expect(toMinorUnits("1299.5")).toBe(129950);
    expect(toMinorUnits("0.29")).toBe(29);
    expect(toMinorUnits("19.99")).toBe(1999);
    expect(toMinorUnits(45)).toBe(4500);
  });

  it("rejects malformed amounts", () => {
    for (const bad of ["1.234", "-5", "abc", "", "1,000"]) expect(() => toMinorUnits(bad)).toThrow();
  });

  it("formats each supported currency", () => {
    expect(formatMoney(129950, "USD")).toBe("$1,299.50");
    expect(formatMoney(70000, "GBP")).toBe("£700");
    expect(formatMoney(82000, "EUR")).toContain("820");
    expect(formatMoney(6500000, "INR")).toBe("₹65,000");
    expect(fromMinorUnits(129950)).toBe("1299.50");
  });
});
