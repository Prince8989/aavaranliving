export type Currency = "usd" | "eur";

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price_usd: number;
  price_eur: number;
  size: string | null;
  material: string | null;
  weave: string | null;
  images: string[];
  stock: number;
  is_active: boolean;
};

export type CartItem = {
  id: string;
  slug: string;
  name: string;
  image: string | null;
  price_usd: number;
  price_eur: number;
  quantity: number;
};
