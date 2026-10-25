# AAVARAN — A House of MATRIKAVA GLOBAL

**The Art of Belonging.** Rooted in India. Crafted for the World.

Premium Indian heritage carpet e-commerce for **aavaranliving.com** — storefront, checkout, customer accounts and a full admin, built for the US, UK, EU and India.

| | |
|---|---|
| Framework | Next.js 15 (App Router), React 19, TypeScript strict |
| Styling | Tailwind CSS 3, self-hosted Cormorant Garamond + Manrope (OFL) |
| Database | PostgreSQL + Prisma 7 (pg driver adapter), versioned migrations |
| Auth | Auth.js v5 — passwordless email links, database sessions, role-based admin |
| Payments | Stripe Checkout (USD/GBP/EUR) · Razorpay (INR) — test mode by default |
| Email | Resend (HTTP API) |
| Images | Vercel Blob |
| Tests | Vitest (unit + integration on Postgres) · Playwright (end-to-end) |
| Hosting | Vercel |

## Quick start (local)

```bash
npm install
cp .env.example .env.local          # fill DATABASE_URL and AUTH_SECRET at minimum
npx prisma migrate deploy           # create tables
SEED_SAMPLES=true npm run db:seed   # collections, journal, labelled sample products
npm run admin:grant -- you@example.com
npm run dev
```

Without `EMAIL_API_KEY`, sign-in links are printed to the dev server console (development only).

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Develop, build, serve |
| `npm run lint` · `npm run typecheck` | ESLint · TypeScript |
| `npm test` | Unit + integration tests (needs a database whose URL contains `test`) |
| `npm run test:e2e` | Playwright end-to-end (run `npm run build` first) |
| `npm run db:deploy` | Apply migrations |
| `npm run db:seed` | Seed collections + journal (drafts). `SEED_SAMPLES=true` adds dev samples |
| `npm run admin:grant -- <email>` | Grant admin role (the only way to create an admin) |

## Architecture

```
app/(store)/      storefront: home, collections, products, search, cart, checkout, account, content pages
app/admin/        admin: dashboard, orders, products, collections, journal, content, shipping, enquiries, audit
app/api/          auth, Stripe + Razorpay webhooks, Razorpay verification
app/actions/      server actions (cart, checkout, forms, account) — CSRF-protected by Next.js
lib/              domain logic: catalog, cart, pricing, inventory, orders, payments, email, auth, validation
prisma/           schema, migrations, seed
tests/            unit, integration, e2e
docs/             deployment and launch documentation
```

### Money, markets and payments
- All amounts are **integer minor units**. Each size has an explicit price **per currency** (a price book) — no silent exchange-rate conversion. A size without a price in the visitor's currency shows "Price on request".
- Currency is chosen by the visitor (suggested from location, never forced) and stored in a cookie, so URLs and canonical pages don't change.
- Shipping is a configured flat rate per zone (US, UK, EU, India) and currency, with an optional free-over threshold. **No rate = no online checkout** for that destination.
- Taxes and duties are never hardcoded. Checkout discloses that import charges may be payable on delivery; Stripe Tax can be enabled with `STRIPE_TAX_ENABLED`.
- Routing: USD/GBP/EUR → Stripe, INR → Razorpay (override with `PAYMENT_ROUTING`).

### Order integrity
- Prices are always re-read from the database at checkout; client values are never trusted.
- Checkout locks variant rows (`SELECT … FOR UPDATE`) and creates time-limited **inventory reservations**, so the last unit can't be sold twice (covered by a concurrency test).
- Orders become paid **only** via a signed webhook (or a signature-verified Razorpay callback), never a browser redirect. Every event is recorded once (`PaymentEvent`) for replay protection; stock is decremented with a conditional update that can't go negative.
- Payment and fulfilment states are stored separately; the customer-facing status is derived.
- Charged-amount mismatches hold the order for review instead of marking it paid.

### Security
Server-side Zod validation everywhere · admin role re-checked on every action · object-level authorization on carts, orders, addresses · database-backed rate limiting (sign-in, checkout, forms) · honeypot + timing anti-spam · magic-byte image validation (no SVG) · CSV formula-injection escaping · security headers (HSTS, frame-deny, nosniff) · audit log for sensitive operations · secrets only in environment variables · live payment keys refused without explicit opt-in · production checkout gate.

## Deploying

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** (Vercel, database, Stripe, Razorpay, Resend, GoDaddy DNS) and **[docs/LAUNCH-CHECKLIST.md](docs/LAUNCH-CHECKLIST.md)** (business information still required).

## Imagery

No photography is included. Until licensed images are uploaded in the admin, pages show an original geometric motif clearly labelled "Photography forthcoming". Do not upload images you don't own or license.

---
AAVARAN is a house of [MATRIKAVA GLOBAL](https://www.matrikavaglobal.com).
