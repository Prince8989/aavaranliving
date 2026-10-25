// Business configuration. Anything marked PLACEHOLDER must be supplied before launch —
// see README "Business data still required". Nothing here is invented.

const env = process.env;

export const site = {
  name: "AAVARAN",
  devanagari: "आवरण",
  parent: "MATRIKAVA GLOBAL",
  parentUrl: "https://www.matrikavaglobal.com",
  tagline: "The Art of Belonging.",
  statement: "Rooted in India. Crafted for the World.",
  url: (env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  supportEmail: env.NEXT_PUBLIC_SUPPORT_EMAIL || null, // PLACEHOLDER until configured
  legalName: env.BUSINESS_LEGAL_NAME || null, // PLACEHOLDER
  legalAddress: env.BUSINESS_ADDRESS || null, // PLACEHOLDER
  social: {
    instagram: env.NEXT_PUBLIC_INSTAGRAM_URL || null,
    pinterest: env.NEXT_PUBLIC_PINTEREST_URL || null,
  },
} as const;

export function absoluteUrl(path = "/") {
  return `${site.url}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Sample products are visible in development, and in production only if explicitly allowed (e.g. staging). */
export function sampleProductsVisible() {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_SAMPLE_PRODUCTS === "true";
}
