"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";
import { CurrencySwitcher } from "./CurrencySwitcher";

export function Header() {
  const { count, currency } = useCart();
  return (
    <header className="sticky top-0 z-20 border-b border-stone/20 bg-sand/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="font-serif text-2xl tracking-wide">
          Aavaran Living
        </Link>
        <nav className="flex items-center gap-5 text-sm">
          <Link href="/shop" className="hover:text-clay">Shop</Link>
          <CurrencySwitcher current={currency} />
          <Link href="/cart" className="hover:text-clay">
            Cart{count > 0 ? ` (${count})` : ""}
          </Link>
        </nav>
      </div>
    </header>
  );
}
