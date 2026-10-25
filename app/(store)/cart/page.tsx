import type { Metadata } from "next";
import { CartPageClient } from "./CartPageClient";
import { currentUser } from "@/lib/authz";

export const metadata: Metadata = { title: "Your Bag", robots: { index: false, follow: false } };

export default async function CartPage() {
  const user = await currentUser();
  return (
    <div className="container-site py-16 lg:py-24">
      <h1 className="mb-12 font-serif text-5xl">Your Bag</h1>
      <CartPageClient userEmail={user?.email ?? null} />
    </div>
  );
}
