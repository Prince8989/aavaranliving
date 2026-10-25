"use client";

import { useState } from "react";
import { useCart } from "./CartProvider";
import type { Product } from "@/lib/types";

export function AddToCart({ product }: { product: Product }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  if (product.stock <= 0) {
    return <button disabled className="w-full rounded bg-stone/30 px-6 py-3 text-ink/60">Sold out</button>;
  }

  return (
    <button
      onClick={() => {
        add({
          id: product.id,
          slug: product.slug,
          name: product.name,
          image: product.images[0] ?? null,
          price_usd: product.price_usd,
          price_eur: product.price_eur,
        });
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
      }}
      className="w-full rounded bg-ink px-6 py-3 text-sand transition hover:bg-clay"
    >
      {added ? "Added to cart" : "Add to cart"}
    </button>
  );
}
