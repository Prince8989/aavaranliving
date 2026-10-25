import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Checkout cancelled", robots: { index: false, follow: false } };

export default function CancelledPage() {
  return (
    <div className="container-site max-w-2xl py-24 text-center">
      <h1 className="font-serif text-5xl">Payment not completed</h1>
      <p className="mt-6 leading-relaxed text-muted">
        No payment was taken. Your bag has been saved — you can return to it whenever you&apos;re ready. Any reserved items are released automatically.
      </p>
      <div className="mt-10">
        <ButtonLink href="/cart">Return to your bag</ButtonLink>
      </div>
    </div>
  );
}
