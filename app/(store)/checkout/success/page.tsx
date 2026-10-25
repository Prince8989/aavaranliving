import type { Metadata } from "next";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { CART_COOKIE, clearCart } from "@/lib/cart";
import { formatMoney } from "@/lib/money";
import { displayStatus } from "@/lib/orders";
import { ButtonLink } from "@/components/ui/Button";
import { PurchaseTracker } from "./PurchaseTracker";

export const metadata: Metadata = { title: "Thank you", robots: { index: false, follow: false } };

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order: number } = await searchParams;
  // Only non-sensitive fields are shown; the order number alone doesn't reveal personal details.
  const order = number
    ? await db.order.findUnique({
        where: { number },
        select: { number: true, total: true, currency: true, paymentStatus: true, fulfillmentStatus: true, createdAt: true },
      })
    : null;

  // The shopper has completed checkout: empty their bag. Payment status itself comes only from the verified webhook.
  const cartId = (await cookies()).get(CART_COOKIE)?.value;
  if (order && cartId) await clearCart(cartId);

  const paid = order?.paymentStatus === "PAID";
  return (
    <div className="container-site max-w-2xl py-24 text-center">
      <p className="label text-walnut">Order {order?.number ?? ""}</p>
      <h1 className="mt-6 font-serif text-5xl">Thank you.</h1>
      {order ? (
        <>
          <p className="mt-6 leading-relaxed text-muted">
            {paid
              ? "Your payment has been confirmed. A confirmation email is on its way."
              : "We're confirming your payment with the payment provider. You'll receive an email as soon as it's confirmed."}
          </p>
          <p className="mt-8 text-lg">
            {formatMoney(order.total, order.currency)} {order.currency} · {displayStatus(order.paymentStatus, order.fulfillmentStatus)}
          </p>
          {paid && <PurchaseTracker currency={order.currency} value={order.total / 100} />}
        </>
      ) : (
        <p className="mt-6 text-muted">We couldn&apos;t find that order. If you were charged, please contact us.</p>
      )}
      <div className="mt-12 flex justify-center gap-4">
        <ButtonLink href="/collections">Continue browsing</ButtonLink>
        <ButtonLink href="/account" variant="outline">
          Your account
        </ButtonLink>
      </div>
    </div>
  );
}
