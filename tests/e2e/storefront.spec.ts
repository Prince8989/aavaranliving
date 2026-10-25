import Stripe from "stripe";
import { expect, test } from "@playwright/test";
import { query, signInAs } from "./helpers";

test.describe.configure({ mode: "serial" });

test("1. homepage loads with brand content and featured products", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/AAVARAN/);
  await expect(page.getByRole("heading", { level: 1, name: "Where Heritage Finds Home." })).toBeVisible();
  await expect(page.getByText("Not Simply Made for a Room. Made to Belong.")).toBeVisible();
  await expect(page.getByTestId("product-card")).toHaveCount(4);
});

test("2. primary navigation works", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Our Story" }).click();
  await expect(page).toHaveURL(/\/our-story$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("The Art of Belonging");
});

test("3. collection page loads and filters by the database", async ({ page }) => {
  await page.goto("/collections/the-earth-collection");
  await expect(page.getByRole("heading", { level: 1, name: "The Earth Collection" })).toBeVisible();
  await expect(page.getByTestId("result-count")).toHaveText("2 carpets");
  await page.getByRole("checkbox", { name: "Flatweave" }).check();
  await expect(page.getByTestId("result-count")).toHaveText("1 carpet");
  await expect(page).toHaveURL(/construction=Flatweave/);
});

test("4. search works", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Search" }).click();
  await page.getByLabel("Search carpets").fill("indigo");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/search\?q=indigo/);
  await expect(page.getByTestId("result-count")).toHaveText("2 carpets");
});

test("5–7. product page, add to bag, and quantity update", async ({ page }) => {
  await page.goto("/products/the-sandstone-reverie");
  await expect(page.getByRole("heading", { level: 1, name: "The Sandstone Reverie" })).toBeVisible();
  await expect(page.getByText("Sample product — not genuine inventory")).toBeVisible();
  await expect(page.getByTestId("product-price")).toContainText("$890");

  const sizes = page.getByRole("group", { name: "Size" });
  await sizes.getByText("8 × 10 ft", { exact: true }).click();
  await expect(page.getByTestId("product-price")).toContainText("$1,590");
  await sizes.getByText("5 × 8 ft", { exact: true }).click();

  await page.getByTestId("add-to-bag").click();
  const drawer = page.getByRole("dialog", { name: /Your Bag/ });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByTestId("cart-line")).toHaveCount(1);
  await expect(page.getByTestId("bag-button")).toHaveAccessibleName(/1 item/);

  // Cart persists across a full reload.
  await page.goto("/cart");
  const main = page.getByRole("main"); // the (closed) drawer also contains the bag
  await expect(main.getByTestId("cart-line")).toHaveCount(1);
  await main.getByTestId("cart-qty").selectOption("2");
  await expect(main.getByTestId("cart-subtotal")).toHaveText("$1,780");
  // Only 3 in stock: 4 is disabled.
  await expect(main.getByTestId("cart-qty").locator("option[value='4']")).toBeDisabled();
});

test("8–10. checkout starts and a signed webhook marks the order paid", async ({ page }) => {
  await page.goto("/products/the-meridian-line");
  await page.getByTestId("add-to-bag").click();
  await expect(page.getByRole("dialog", { name: /Your Bag/ }).getByTestId("cart-line")).toHaveCount(1);
  await page.goto("/cart");
  await page.getByRole("main").getByLabel("Deliver to").selectOption("US");
  await expect(page.getByRole("main").getByText("Payment will be taken in USD.")).toBeVisible();
  await page.getByTestId("checkout-button").click();

  // Our server created the order and a Stripe Checkout Session (mocked API) and redirected.
  await expect(page).toHaveURL(/\/checkout\/success\?order=AAV-\d{6}/);
  const number = new URL(page.url()).searchParams.get("order")!;
  await expect(page.getByText(/confirming your payment/)).toBeVisible();

  const [order] = await query<{ id: string; total: number; paymentStatus: string }>(`SELECT id, total, "paymentStatus" FROM "Order" WHERE number=$1`, [number]);
  expect(order.paymentStatus).toBe("PENDING");
  const [payment] = await query<{ providerRef: string }>(`SELECT "providerRef" FROM "Payment" WHERE "orderId"=$1`, [order.id]);

  // Deliver a correctly signed checkout.session.completed webhook to the real endpoint.
  const payload = JSON.stringify({
    id: `evt_e2e_${Date.now()}`,
    object: "event",
    type: "checkout.session.completed",
    data: {
      object: {
        id: payment.providerRef,
        object: "checkout.session",
        metadata: { orderId: order.id },
        payment_status: "paid",
        payment_intent: "pi_e2e",
        amount_total: order.total,
        currency: "usd",
        total_details: { amount_tax: 0 },
        customer_details: { email: "e2e-buyer@test.local", name: "E2E Buyer", address: { country: "US" } },
      },
    },
  });
  const sig = new Stripe("sk_test_x").webhooks.generateTestHeaderString({ payload, secret: "whsec_e2e_test" });
  const forged = await page.request.post("/api/webhooks/stripe", { data: payload, headers: { "stripe-signature": "t=1,v1=bad", "content-type": "application/json" } });
  expect(forged.status()).toBe(400);
  const res = await page.request.post("/api/webhooks/stripe", { data: payload, headers: { "stripe-signature": sig, "content-type": "application/json" } });
  expect(res.status()).toBe(200);

  const [after] = await query<{ paymentStatus: string; email: string }>(`SELECT "paymentStatus", email FROM "Order" WHERE id=$1`, [order.id]);
  expect(after).toEqual({ paymentStatus: "PAID", email: "e2e-buyer@test.local" });
  await page.reload();
  await expect(page.getByText("Your payment has been confirmed.")).toBeVisible();
});

test("11. admin can view orders", async ({ page, context }) => {
  await signInAs(context, "owner-e2e@test.local", "ADMIN");
  await page.goto("/admin/orders");
  await expect(page.getByRole("heading", { level: 1, name: "Orders" })).toBeVisible();
  const row = page.getByRole("row").filter({ hasText: "E2E Buyer" }).first();
  await expect(row).toContainText("PAID");
  await row.getByRole("link").click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Order AAV-");
  await expect(page.getByText("The Meridian Line — 5 × 8 ft")).toBeVisible();
});

test("12. unauthorized users cannot access admin", async ({ page, context, request }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fadmin/);
  expect((await request.get("/admin/orders/export")).status()).toBe(404);

  await signInAs(context, "customer-e2e@test.local", "CUSTOMER");
  const res = await page.goto("/admin/orders");
  expect(res?.status()).toBe(404);
  expect((await page.request.get("/admin/orders/export")).status()).toBe(404);
});

test("13. mobile navigation works", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const page = await ctx.newPage();
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  const menu = page.getByRole("dialog", { name: "Menu" });
  await expect(menu).toBeVisible();
  await menu.getByRole("link", { name: "Journal" }).click();
  await expect(page).toHaveURL(/\/journal$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Notes on carpets");
  await ctx.close();
});

test("14. forms validate and submit", async ({ page }) => {
  await page.goto("/contact");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("Enter your name")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Name", exact: true })).toHaveAttribute("aria-invalid", "true");

  await page.getByRole("textbox", { name: "Name", exact: true }).fill("Asha Rao");
  await page.getByRole("textbox", { name: "Email", exact: true }).fill("asha@test.local");
  await page.getByRole("textbox", { name: "Message", exact: true }).fill("Could you share more about the Heritage Collection?");
  await page.waitForTimeout(2100); // anti-spam minimum fill time
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByTestId("contact-success")).toBeVisible();
  const [row] = await query<{ count: string }>(`SELECT count(*) FROM "Enquiry" WHERE email='asha@test.local'`);
  expect(Number(row.count)).toBe(1);
});

test("currency selection changes prices without changing the URL", async ({ page }) => {
  await page.goto("/products/the-lotus-court");
  await page.getByTestId("currency-select").first().selectOption("EUR");
  await expect(page.getByTestId("product-price")).toContainText("€");
  await expect(page).toHaveURL(/\/products\/the-lotus-court$/);
});
