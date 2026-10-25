"use client";

import { useCart } from "@/components/cart/CartProvider";
import { CartLines } from "@/components/cart/CartSummary";
import { CheckoutPanel } from "@/components/cart/CheckoutPanel";
import { ButtonLink } from "@/components/ui/Button";

export function CartPageClient({ userEmail }: { userEmail: string | null }) {
  const { cart, error } = useCart();
  if (cart.lines.length === 0) {
    return (
      <div className="border border-ink/10 px-8 py-20 text-center">
        <p className="font-serif text-3xl">Your bag is empty.</p>
        <div className="mt-8">
          <ButtonLink href="/collections">Explore Collections</ButtonLink>
        </div>
      </div>
    );
  }
  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_26rem]">
      <div>
        {error && (
          <p role="alert" className="mb-4 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        )}
        <CartLines />
      </div>
      <CheckoutPanel userEmail={userEmail} />
    </div>
  );
}
