# Launch checklist — business information still required

The application accepts all of this through the admin or environment variables — no code changes needed. Nothing below has been invented; where it is missing the site shows a neutral placeholder or blocks the unsafe operation.

## Catalogue — `/admin/products`
- [ ] Real carpet catalogue (names, descriptions) — then **delete or archive the 5 sample products** if they were seeded anywhere
- [ ] Licensed product photography: main image, multiple angles, texture close-ups, room settings (with alt text)
- [ ] Verified materials, construction technique, country of origin, pile height
- [ ] Exact dimensions per size (cm) and weights
- [ ] Stock levels per size
- [ ] Selling prices per currency (USD, GBP, EUR, INR) — enter only the currencies you will actually sell in
- [ ] Care instructions per product
- [ ] Collection photography and final collection copy — `/admin/collections`

## Business identity — environment variables
- [ ] Legal business name (`BUSINESS_LEGAL_NAME`) and registered address (`BUSINESS_ADDRESS`)
- [ ] Customer support email (`NEXT_PUBLIC_SUPPORT_EMAIL`) on your domain
- [ ] Social profile URLs

## Payments
- [ ] Merchant account(s) approved for your entity (Stripe India is invite-only; physical-goods exports require an IEC)
- [ ] Confirm which provider settles which currency; set `PAYMENT_ROUTING` if different from the default
- [ ] Test-mode orders and refunds verified for each provider
- [ ] Live keys + live webhook secrets, then `PAYMENTS_LIVE_MODE=true` (explicit approval)

## Shipping — `/admin/shipping`
- [ ] Carrier(s) chosen (rugs are bulky — confirm dimensional-weight pricing)
- [ ] Real rate per zone (US, UK, EU, India) and currency; optional free-shipping threshold
- [ ] Dispatch and delivery timelines for the Shipping Policy

## Tax & duties
- [ ] Accountant's advice on US sales tax, UK VAT (incl. low-value import rules), EU VAT/IOSS, Indian GST and export documentation
- [ ] Decide whether prices are tax-inclusive per market, and whether duties are prepaid (DDP) or paid by the recipient (DAP)
- [ ] If registered: configure Stripe Tax and set `STRIPE_TAX_ENABLED=true`
- [ ] Update the tax/duty disclosure text in `lib/markets.ts` (`TAX_DISCLOSURE`) to match

## Legal pages — `/admin/content` → "Legal & policy pages"
- [ ] Shipping Policy · Return & Refund Policy · Privacy Policy (GDPR/UK GDPR, India DPDP Act) · Terms and Conditions
      Have these reviewed by a lawyer. They're required by Stripe/Razorpay and Meta ads.

## Content
- [ ] Review and publish the 5 seeded journal articles (they're drafts in production) — `/admin/journal`
- [ ] Review homepage/brand copy — `/admin/content`

## Final switches
- [ ] `STORE_CHECKOUT_ENABLED=true`
- [ ] Search Console verified, sitemap submitted
- [ ] Admin access: `npm run admin:grant -- <email>` for each staff member
