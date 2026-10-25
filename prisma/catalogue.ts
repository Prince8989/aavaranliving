// Real AAVARAN catalogue. Seeded idempotently on every deploy: a product is created only if its
// slug does not exist yet, so later edits made in /admin are never overwritten.
// Prices are in minor units (cents / pence). INR is deliberately omitted: these carpets are sold to US, UK and EU buyers only.

type CatalogueImage = { url: string; alt: string; kind: "GALLERY" | "TEXTURE" | "ROOM" };
type CatalogueVariant = { label: string; w: number; l: number; stock: number; usd: number; gbp: number; eur: number };

export type CatalogueProduct = {
  slug: string;
  sku: string;
  name: string;
  collection: string;
  description: string;
  material: string;
  construction: string;
  colour: string;
  pattern: string;
  careInstructions: string;
  featured: boolean;
  featuredRank: number | null;
  seoTitle: string;
  seoDescription: string;
  videoUrl?: string;
  videoPoster?: string;
  images: CatalogueImage[];
  variants: CatalogueVariant[];
};

const LEAD_TIME =
  "Made to order by hand in Bhadohi, India. Each carpet takes around 45 days to complete; drying and finishing can take a little longer in humid or cold seasons.";

const CARE =
  "Vacuum regularly on a low setting without a beater bar.\nBlot spills straight away with a clean, dry cloth. Do not rub.\nRotate every few months for even wear and light exposure.\nProfessional wool-carpet cleaning only.";

// Stock is a made-to-order allowance (orders accepted before the queue is reviewed), not finished inventory.
const MADE_TO_ORDER_ALLOWANCE = 10;

export const CATALOGUE: CatalogueProduct[] = [
  {
    slug: "agni-hand-tufted-wool-carpet",
    sku: "AAV-AGNI",
    name: "Agni",
    collection: "the-bhadohi-collection",
    description: `A sculptural statement in vermilion and black. Agni (fire, in Sanskrit) traces molten, organic forms that spill across a free-form silhouette, so the carpet reads as a piece of art on the floor rather than a rectangle. Hand-tufted in New Zealand wool and finished by hand. ${LEAD_TIME}`,
    material: "100% New Zealand wool pile",
    construction: "Hand-tufted",
    colour: "Red / Black",
    pattern: "Abstract organic, irregular shape",
    careInstructions: CARE,
    featured: true,
    featuredRank: 1,
    seoTitle: "Agni — Red & Black Organic-Shape Hand-Tufted Wool Rug, 8 × 10 ft",
    seoDescription:
      "Agni: a free-form red and black hand-tufted New Zealand wool carpet, 8 × 10 ft. Made to order by hand in Bhadohi, India. Ships to the US, UK and Europe.",
    videoUrl: "/media/agni-film.mp4",
    videoPoster: "/media/agni-film-poster.jpg",
    images: [
      { url: "/catalogue/agni-top-down.webp", alt: "Agni carpet seen from above: red organic forms on a black free-form ground", kind: "GALLERY" },
      { url: "/catalogue/agni-full-view.webp", alt: "Agni carpet laid flat on a concrete floor, full length", kind: "GALLERY" },
      { url: "/catalogue/agni-angle.webp", alt: "Agni carpet photographed at an angle showing its irregular scalloped outline", kind: "GALLERY" },
      { url: "/catalogue/agni-wide.webp", alt: "Agni carpet, wide view of the complete design", kind: "GALLERY" },
      { url: "/catalogue/agni-texture-pile.webp", alt: "Close-up of the dense wool pile where red meets black", kind: "TEXTURE" },
      { url: "/catalogue/agni-texture-edge.webp", alt: "Close-up of the bound edge and the backing", kind: "TEXTURE" },
    ],
    variants: [{ label: "8 × 10 ft", w: 244, l: 305, stock: MADE_TO_ORDER_ALLOWANCE, usd: 225000, gbp: 175000, eur: 199000 }],
  },
  {
    slug: "alankar-hand-tufted-wool-carpet",
    sku: "AAV-ALANKAR",
    name: "Alankar",
    collection: "the-bhadohi-collection",
    description: `Quiet ornament on an ivory field. Alankar (adornment) frames a calm cream ground with a fine walnut-brown double border, scrolling corner motifs and a central filigree medallion, finished with knotted fringes at each end. A heritage composition drawn with restraint, made for light, refined rooms. Hand-tufted in New Zealand wool. ${LEAD_TIME}`,
    material: "100% New Zealand wool pile",
    construction: "Hand-tufted",
    colour: "Ivory / Walnut brown",
    pattern: "Border and central medallion",
    careInstructions: `${CARE}\nDo not pull loose fringe threads; trim them level with scissors.`,
    featured: true,
    featuredRank: 2,
    seoTitle: "Alankar — Ivory & Brown Medallion Hand-Tufted Wool Rug, 8 × 10 ft",
    seoDescription:
      "Alankar: an ivory hand-tufted New Zealand wool carpet with a walnut-brown border and filigree medallion, 8 × 10 ft. Made to order in Bhadohi, India.",
    images: [
      { url: "/catalogue/alankar-top-down.webp", alt: "Alankar carpet from above: ivory field, brown double border, scroll corners and central medallion", kind: "GALLERY" },
      { url: "/catalogue/alankar-angle.webp", alt: "Alankar carpet at an angle on a marble floor, showing the border and fringe", kind: "GALLERY" },
      { url: "/catalogue/alankar-room.webp", alt: "Alankar carpet in a light living room with linen armchairs", kind: "ROOM" },
    ],
    variants: [{ label: "8 × 10 ft", w: 244, l: 305, stock: MADE_TO_ORDER_ALLOWANCE, usd: 215000, gbp: 165000, eur: 189000 }],
  },
];
