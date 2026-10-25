"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useCart } from "@/components/CartProvider";

export default function SuccessPage() {
  const { clear } = useCart();
  useEffect(() => clear(), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="py-20 text-center">
      <h1 className="font-serif text-4xl">Thank you for your order</h1>
      <p className="mx-auto mt-4 max-w-md text-stone">
        A confirmation email is on its way. We&apos;ll send tracking details once your rug ships.
      </p>
      <Link href="/shop" className="mt-8 inline-block underline hover:text-clay">Continue shopping</Link>
    </div>
  );
}
