# AAVARAN — build handover (25 Oct 2026)

**Repository:** https://github.com/Prince8989/aavaranliving (branch `main`, commits `fe887fa`, `1ae0694`)
**Vercel project / preview URL:** not created — needs the owner's Vercel login (docs/DEPLOYMENT.md §2)
**Production domain:** aavaranliving.com not yet connected — needs Vercel project + GoDaddy DNS change (§7)

## Verified (executed in the build sandbox)
| Check | Result |
|---|---|
| ESLint | pass, 0 warnings |
| TypeScript strict | pass |
| Production build (`next build`) | pass — 44 routes, 103–119 kB first-load JS |
| Unit tests (Vitest) | 37 / 37 pass |
| Integration tests on PostgreSQL 16 | 22 / 22 pass |
| End-to-end (Playwright, Chromium, production build) | 11 / 11 pass — covers the brief's 14 scenarios |

## Not verified — be aware
- **Real Stripe test-mode checkout** was not run: the sandbox can't reach api.stripe.com and no keys exist. E2E used a local mock of the Stripe API; webhook signatures and order/stock updates were tested for real.
- **Razorpay checkout window** not exercised in a browser; signature verification and idempotent confirmation are tested.
- **Emails** never sent (no Resend key); templates exist but haven't been seen in an inbox.
- **Migration SQL** was written by hand because Prisma's schema engine download was blocked here. It is exercised by every integration/e2e test through the real Prisma client. On first setup, run once: `npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script --shadow-database-url <empty db>` — expected output: empty.
- No automated accessibility or Lighthouse audit was run.

## Admin access
No default admin exists. After migrations: `DATABASE_URL=<direct url> npm run admin:grant -- you@domain.com`, then sign in at /login via the emailed link (requires Resend configured).

## Safety switches (all off by default)
`STORE_CHECKOUT_ENABLED` (production checkout gate) · `PAYMENTS_LIVE_MODE` (live keys refused without it) · `ALLOW_SAMPLE_PRODUCTS` (staging only).

## Outstanding before launch
See docs/LAUNCH-CHECKLIST.md: real catalogue & licensed photography, prices per currency, carriers & shipping rates, tax/duty advice, legal policies, merchant accounts (Stripe India is invite-only; physical exports need an IEC), business name/address/support email, Resend domain verification.
