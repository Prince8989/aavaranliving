"use client";

import { useRouter } from "next/navigation";
import { CURRENCY_COOKIE } from "@/lib/currency";
import type { Currency } from "@/lib/types";

export function CurrencySwitcher({ current }: { current: Currency }) {
  const router = useRouter();

  function change(next: Currency) {
    document.cookie = `${CURRENCY_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <select
      aria-label="Currency"
      value={current}
      onChange={(e) => change(e.target.value as Currency)}
      className="rounded border border-stone/40 bg-transparent px-2 py-1 text-sm"
    >
      <option value="usd">USD $</option>
      <option value="eur">EUR €</option>
    </select>
  );
}
