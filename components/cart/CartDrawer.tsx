"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";
import { CartLines, CartTotals, ShipToSelector } from "./CartSummary";
import { buttonClass } from "@/components/ui/Button";

export function CartDrawer() {
  const { cart, drawerRef, close, error } = useCart();
  return (
    <dialog
      ref={drawerRef}
      className="drawer"
      aria-labelledby="cart-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) close(); // click on backdrop
      }}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-ink/10 px-6 py-5">
          <h2 id="cart-title" className="font-serif text-2xl">
            Your Bag {cart.count > 0 && <span className="text-base text-muted">({cart.count})</span>}
          </h2>
          <button type="button" onClick={close} className="p-2 text-2xl leading-none" aria-label="Close bag">
            ×
          </button>
        </div>

        {cart.lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
            <p className="font-serif text-2xl">Your bag is empty.</p>
            <Link href="/collections" onClick={close} className={buttonClass("outline")}>
              Explore Collections
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6">
              {error && (
                <p className="mt-4 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                  {error}
                </p>
              )}
              <CartLines compact />
            </div>
            <div className="space-y-4 border-t border-ink/10 px-6 py-5">
              <ShipToSelector />
              <CartTotals />
              <Link href="/cart" onClick={close} className={buttonClass("primary", "w-full")}>
                Review &amp; Checkout
              </Link>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
