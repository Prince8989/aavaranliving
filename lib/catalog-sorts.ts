// Client-safe constants (catalog.ts imports the database and must stay server-only).
export const SORTS = {
  featured: "Featured",
  "price-asc": "Price: Low to High",
  "price-desc": "Price: High to Low",
  newest: "Newest",
  name: "Name",
} as const;
export type SortKey = keyof typeof SORTS;
