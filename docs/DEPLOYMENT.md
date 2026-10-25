# Deployment — aavaranliving.com on Vercel

Each step below needs an account login that only the owner can perform. Nothing here enables live payments; that is a separate, explicit step at the end.

## 1. Database (managed PostgreSQL)

1. In Vercel → **Storage** (Marketplace) create a **Neon Postgres** database (any managed Postgres 14+ works).
2. Note two connection strings: the **pooled** URL (for the app) and the **direct/unpooled** URL (for migrations).
3. Apply migrations from your computer **against the direct URL** (this is a production database change — run it deliberately):
   ```bash
   DATABASE_URL="<direct url>" npm run db:deploy
   DATABASE_URL="<direct url>" npm run db:seed          # collections + journal drafts (no sample products)
   DATABASE_URL="<direct url>" npm run admin:grant -- you@yourdomain.com
   ```
   Never run `SEED_SAMPLES=true` against production.

## 2. Vercel project

1. Vercel → **Add New → Project** → import `Prince8989/aavaranliving`. Framework: Next.js (detected). Build command: default (`npm run build`, which runs `prisma generate`).
2. **Environment Variables** (Production + Preview) — from `.env.example`:
   - `DATABASE_URL` = pooled URL · `AUTH_SECRET` = output of `openssl rand -base64 32`
   - `NEXT_PUBLIC_SITE_URL` = `https://aavaranliving.com` (Preview: the preview URL)
   - `STORE_CHECKOUT_ENABLED=false`, `PAYMENTS_LIVE_MODE=false` until launch
   - Stripe/Razorpay **test** keys, Resend, Blob (steps 3–6)
3. **Storage → Blob** → create a store and connect it; Vercel adds `BLOB_READ_WRITE_TOKEN`.
4. Deploy. Every push to `main` deploys production; other branches get preview URLs.

**Recommended:** use a separate Preview database (Neon branch) so testing never touches production data. For a staging environment that shows sample products, set `ALLOW_SAMPLE_PRODUCTS=true` there only.

## 3. Stripe (USD / GBP / EUR)

> **Eligibility:** Stripe accounts for India-based businesses are **invite-only**, and selling physical goods abroad requires an **Importer Exporter Code (IEC)** and opting in to exports (see Stripe's "Accept international payments from India" docs). If MATRIKAVA GLOBAL can't obtain a Stripe India account, options include a Stripe account held by an eligible entity in another country, or routing international currencies to Razorpay International via `PAYMENT_ROUTING`. Confirm with each provider before launch.

1. Dashboard (test mode) → Developers → API keys → `STRIPE_SECRET_KEY` (`sk_test_…`).
2. Developers → Webhooks → **Add endpoint** `https://aavaranliving.com/api/webhooks/stripe` with events:
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `charge.refunded`.
   Copy the signing secret → `STRIPE_WEBHOOK_SECRET`.
3. Test: add a product to the bag, check out with card `4242 4242 4242 4242`, confirm the order shows **Paid** in `/admin/orders`. Also try `4000 0000 0000 9995` (declined).
4. Taxes: if you register for VAT/sales tax, configure **Stripe Tax** and set `STRIPE_TAX_ENABLED=true`.

## 4. Razorpay (INR)

1. Dashboard (test mode) → Settings → API Keys → `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`.
2. Settings → Webhooks → `https://aavaranliving.com/api/webhooks/razorpay`, events `payment.captured` and `order.paid`, set a secret → `RAZORPAY_WEBHOOK_SECRET`.
3. Test with INR selected and an Indian delivery address using Razorpay's test cards/UPI.

## 5. Email (Resend)

1. Create a Resend account → **Domains** → add `aavaranliving.com` (or a subdomain such as `mail.aavaranliving.com`).
2. Add the DNS records Resend shows (SPF/DKIM/MX for the sending subdomain) in GoDaddy — see step 7. Wait for **Verified**.
3. Set `EMAIL_API_KEY`, `EMAIL_FROM="AAVARAN <orders@aavaranliving.com>"`, `ADMIN_EMAIL`.
   Sign-in links require email; in production, sign-in is refused until email is configured.

## 6. Analytics (optional)

Set `NEXT_PUBLIC_GA4_ID` and/or `NEXT_PUBLIC_META_PIXEL_ID`. Tags load only after a visitor clicks **Accept all**. Verify the site in Google Search Console and submit `https://aavaranliving.com/sitemap.xml`.

## 7. Domain — GoDaddy → Vercel

Do **not** change nameservers; keep DNS at GoDaddy so existing email records keep working.

1. Vercel → Project → **Settings → Domains** → add `aavaranliving.com` and `www.aavaranliving.com`. Choose `aavaranliving.com` as primary; set `www` to **redirect (308)** to it.
2. Vercel then shows the **exact records to create**. Use those values — they can be project-specific, so don't copy examples from the internet.
3. GoDaddy → My Products → `aavaranliving.com` → **DNS**:
   - **Before editing, screenshot/export the current records.** Leave every `MX`, `TXT` (SPF, DKIM, DMARC, site verification) and email-related `CNAME` untouched.
   - Apex (`@`): edit/replace the existing `A` record(s) (often GoDaddy "Parked" / website-builder records) with the `A` value Vercel shows. Remove any other `A`/`AAAA` records on `@` that point elsewhere (forwarding/parking).
   - `www`: set the `CNAME` to the value Vercel shows.
   - If GoDaddy **Domain Forwarding** is enabled, turn it off (it overrides these records).
4. Back in Vercel, wait for both domains to show **Valid Configuration**; Vercel issues HTTPS certificates automatically.
5. Verify: `https://aavaranliving.com` loads with a valid certificate; `https://www.aavaranliving.com` redirects to it; `http://` redirects to `https://`; email still sends/receives.

## 8. Go-live (requires your explicit decision)

1. Complete **docs/LAUNCH-CHECKLIST.md**.
2. Place and refund a real low-value order in test mode end-to-end.
3. Swap to live keys (`sk_live_…`, `rzp_live_…`) and new live webhook secrets, then set `PAYMENTS_LIVE_MODE=true`.
4. Set `STORE_CHECKOUT_ENABLED=true` and redeploy.
5. Place one real order, confirm it in `/admin`, refund it from the order page.
