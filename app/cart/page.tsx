"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/CartProvider";
import { formatPrice, priceFor } from "@/lib/currency";

export default function CartPage() {
  const { items, currency, setQuantity, remove } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = items.reduce((sum, i) => sum + priceFor(i, currency) * i.quantity, 0);

  async function checkout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currency,
          items: items.map((i) => ({ id: i.id, quantity: i.quantity })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "Checkout failed");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="py-20 text-center">
        <h1 className="font-serif text-4xl">Your cart is empty</h1>
        <Link href="/shop" className="mt-6 inline-block underline hover:text-clay">Browse rugs</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-8 font-serif text-4xl">Cart</h1>
      <ul className="divide-y divide-stone/20">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-4 py-4">
            <div className="h-20 w-16 flex-shrink-0 overflow-hidden rounded bg-stone/10">
              {item.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="flex-1">
              <Link href={`/products/${item.slug}`} className="font-serif text-lg">{item.name}</Link>
              <p className="text-sm text-stone">{formatPrice(priceFor(item, currency), currency)}</p>
            </div>
            <input
              type="number"
              min={1}
              value={item.quantity}
              onChange={(e) => setQuantity(item.id, Number(e.target.value))}
              className="w-16 rounded border border-stone/40 bg-transparent px-2 py-1"
              aria-label={`Quantity of ${item.name}`}
            />
            <button onClick={() => remove(item.id)} className="text-sm text-stone hover:text-clay">Remove</button>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex items-center justify-between border-t border-stone/20 pt-6">
        <span className="text-lg">Subtotal</span>
        <span className="text-lg">{formatPrice(subtotal, currency)}</span>
      </div>
      <p className="mt-1 text-sm text-stone">Shipping and taxes are calculated at checkout.</p>

      {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
      <button
        onClick={checkout}
        disabled={loading}
        className="mt-6 w-full rounded bg-ink px-6 py-3 text-sand hover:bg-clay disabled:opacity-60"
      >
        {loading ? "Redirecting to secure checkout…" : "Checkout"}
      </button>
    </div>
  );
}
