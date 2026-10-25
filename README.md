# Aavaran Living — aavaranliving.com

Independent online store for handcrafted rugs, selling to the US and Europe.

**Stack:** Next.js 15 · Supabase (database + image storage) · Stripe Checkout (payments) · Vercel (hosting)

## How it fits together

```
Claude / you push to GitHub  →  Vercel auto-deploys  →  aavaranliving.com
Shopper pays on Stripe  →  Stripe webhook  →  order saved in Supabase, stock reduced
```

## Go-live checklist

1. **Supabase** — create a project at supabase.com → SQL Editor → run `supabase/schema.sql`.
   Create a public Storage bucket `products` for rug photos.
2. **Stripe** — create an account (an Indian business can use Stripe; check current onboarding requirements
   for international payments). Copy the test secret key.
3. **Vercel** — vercel.com → Add New Project → import `Prince8989/aavaranliving`.
   Add every variable from `.env.example` under Environment Variables.
4. **Stripe webhook** — Developers → Webhooks → add endpoint
   `https://aavaranliving.com/api/webhooks/stripe`, event `checkout.session.completed`.
   Put its signing secret in `STRIPE_WEBHOOK_SECRET`.
5. **Domain** — Vercel → Project → Settings → Domains → add `aavaranliving.com`,
   then add the DNS records Vercel shows at your domain registrar.
6. Place a test order with card `4242 4242 4242 4242`, confirm it appears in Supabase `orders`.
7. Switch Stripe to live keys.

## Managing products

For now, products are added in Supabase → Table Editor → `products`
(prices in cents: $899.00 = `89900`). Upload photos to the `products` bucket and paste the public URLs
into `images`. A custom admin panel can be added later.

## Not yet built (needed before scaling)

- Order confirmation / shipping emails (Stripe sends a receipt if enabled in Stripe settings)
- Admin panel for products and orders
- Legal pages: shipping, returns, privacy, terms — required for Stripe and Meta ads
- EU VAT / US sales tax handling (Stripe Tax can be enabled at checkout)
- Product filtering (size, colour, material)

## Local development

```bash
npm install
cp .env.example .env.local   # fill in keys
npm run dev
```
