import crypto from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { bespokeSchema, cartAddSchema, enquirySchema, isSpam, newsletterSchema, razorpayCheckoutSchema } from "@/lib/validation";
import { escapeHtml, isSameOrigin } from "@/lib/security";
import { detectImageType } from "@/lib/storage";
import { verifyPaymentSignature, verifyWebhookSignature } from "@/lib/payments/razorpay";
import { displayStatus, formatOrderNumber } from "@/lib/orders";
import { canTransition, ordersCsv } from "@/lib/admin/orders";
import { hasSufficientStock } from "@/lib/inventory";

vi.mock("@/lib/auth", () => ({ auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn(), handlers: {} }));

describe("input validation", () => {
  it("validates enquiries", () => {
    const ok = enquirySchema.safeParse({ type: "GENERAL", name: "Asha", email: "ASHA@Example.com ", message: "I would like to know more." });
    expect(ok.success).toBe(true);
    if (ok.success) expect(ok.data.email).toBe("asha@example.com");
    const bad = enquirySchema.safeParse({ type: "GENERAL", name: "A", email: "nope", message: "short" });
    expect(bad.success).toBe(false);
    expect(enquirySchema.safeParse({ type: "HACK", name: "Asha", email: "a@b.co", message: "long enough message" }).success).toBe(false);
  });

  it("validates bespoke enquiries and limits budget values", () => {
    const base = { name: "Asha", email: "a@b.co", country: "UK", dimensions: "9 x 12 ft" };
    expect(bespokeSchema.safeParse(base).success).toBe(true);
    expect(bespokeSchema.safeParse({ ...base, budget: "a-lot" }).success).toBe(false);
    expect(bespokeSchema.safeParse({ ...base, referenceImageUrl: "javascript:alert(1)" }).success).toBe(false);
  });

  it("requires explicit newsletter consent", () => {
    expect(newsletterSchema.safeParse({ email: "a@b.co" }).success).toBe(false);
    expect(newsletterSchema.safeParse({ email: "a@b.co", consent: "yes" }).success).toBe(true);
  });

  it("bounds cart quantities", () => {
    expect(cartAddSchema.safeParse({ variantId: "v1", quantity: 0 }).success).toBe(false);
    expect(cartAddSchema.safeParse({ variantId: "v1", quantity: 11 }).success).toBe(false);
    expect(cartAddSchema.safeParse({ variantId: "v1", quantity: "2" }).success).toBe(true);
  });

  it("requires a phone and full address for Indian checkout", () => {
    const address = { name: "Asha Rao", line1: "12 MG Road", city: "Bengaluru", postalCode: "560001", country: "IN" };
    expect(razorpayCheckoutSchema.safeParse({ email: "a@b.co", address }).success).toBe(false);
    expect(razorpayCheckoutSchema.safeParse({ email: "a@b.co", address: { ...address, phone: "+919876543210" } }).success).toBe(true);
  });

  it("detects spam via honeypot and fill time", () => {
    expect(isSpam({ website: "http://spam" })).toBe(true);
    expect(isSpam({ startedAt: Date.now() })).toBe(true);
    expect(isSpam({ startedAt: Date.now() - 10_000 })).toBe(false);
  });
});

describe("security helpers", () => {
  it("escapes HTML for emails", () => {
    expect(escapeHtml(`<img src=x onerror="alert('x')">`)).toBe("&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;");
  });

  it("rejects cross-origin requests", () => {
    const req = (origin: string | null) => new Request("http://localhost:3000/api/x", { method: "POST", headers: { host: "localhost:3000", ...(origin ? { origin } : {}) } });
    expect(isSameOrigin(req("http://localhost:3000"))).toBe(true);
    expect(isSameOrigin(req("https://evil.example"))).toBe(false);
    expect(isSameOrigin(req(null))).toBe(false);
  });

  it("accepts real images by magic bytes and rejects disguised files", () => {
    expect(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]))?.type).toBe("image/jpeg");
    expect(detectImageType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))?.type).toBe("image/png");
    expect(detectImageType(Buffer.from("<svg onload=alert(1)>"))).toBeNull();
    expect(detectImageType(Buffer.from("GIF89a"))).toBeNull();
  });

  it("verifies Razorpay signatures and rejects tampering", () => {
    const secret = "rzp_test_secret";
    const sig = crypto.createHmac("sha256", secret).update("order_1|pay_1").digest("hex");
    expect(verifyPaymentSignature("order_1", "pay_1", sig, secret)).toBe(true);
    expect(verifyPaymentSignature("order_1", "pay_2", sig, secret)).toBe(false);
    expect(verifyPaymentSignature("order_1", "pay_1", "0".repeat(64), secret)).toBe(false);
    const body = '{"event":"payment.captured"}';
    const wsig = crypto.createHmac("sha256", "whsec").update(body).digest("hex");
    expect(verifyWebhookSignature(body, wsig, "whsec")).toBe(true);
    expect(verifyWebhookSignature(body + " ", wsig, "whsec")).toBe(false);
    expect(verifyWebhookSignature(body, null, "whsec")).toBe(false);
  });
});

describe("orders and inventory rules", () => {
  it("derives display status from separate payment and fulfilment states", () => {
    expect(displayStatus("PENDING", "UNFULFILLED")).toBe("Pending Payment");
    expect(displayStatus("PAID", "UNFULFILLED")).toBe("Paid");
    expect(displayStatus("PAID", "PROCESSING")).toBe("Processing");
    expect(displayStatus("PAID", "SHIPPED")).toBe("Shipped");
    expect(displayStatus("PAID", "DELIVERED")).toBe("Delivered");
    expect(displayStatus("CANCELLED", "UNFULFILLED")).toBe("Cancelled");
    expect(displayStatus("REFUNDED", "DELIVERED")).toBe("Refunded");
    expect(formatOrderNumber(42)).toBe("AAV-000042");
  });

  it("only allows valid fulfilment transitions", () => {
    expect(canTransition("UNFULFILLED", "PROCESSING")).toBe(true);
    expect(canTransition("SHIPPED", "DELIVERED")).toBe(true);
    expect(canTransition("DELIVERED", "UNFULFILLED")).toBe(false);
    expect(canTransition("CANCELLED", "SHIPPED")).toBe(false);
  });

  it("validates stock availability", () => {
    expect(hasSufficientStock(3, 3)).toBe(true);
    expect(hasSufficientStock(2, 3)).toBe(false);
    expect(hasSufficientStock(5, 0)).toBe(false);
  });

  it("neutralises spreadsheet formula injection in CSV exports", () => {
    const csv = ordersCsv([
      { number: "AAV-000001", createdAt: new Date("2026-01-01"), email: "a@b.co", customerName: "=HYPERLINK(\"x\")", currency: "USD", subtotal: 100, shippingTotal: 0, taxTotal: 0, total: 100, paymentStatus: "PAID", fulfillmentStatus: "UNFULFILLED", shippingCountry: "US" },
    ]);
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
    expect(csv.split("\n")).toHaveLength(2);
  });
});
