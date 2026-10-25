"use client";

import { useId } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { CURRENCIES, CURRENCY_META } from "@/lib/markets";

export function CurrencySelector({ light = false }: { light?: boolean }) {
  const { cart, setCurrency, pending } = useCart();
  const id = useId();
  return (
    <div className="flex items-center">
      <label htmlFor={id} className="sr-only">
        Currency
      </label>
      <select
        id={id}
        value={cart.currency}
        disabled={pending}
        onChange={(e) => setCurrency(e.target.value)}
        className={`cursor-pointer appearance-none bg-transparent px-2 py-1 text-[0.72rem] font-medium uppercase tracking-[0.15em] ${
          light ? "text-ivory [&>option]:text-ink" : "text-ink"
        }`}
        data-testid="currency-select"
      >
        {CURRENCIES.map((c) => (
          <option key={c} value={c}>
            {CURRENCY_META[c].symbol} {c}
          </option>
        ))}
      </select>
    </div>
  );
}
