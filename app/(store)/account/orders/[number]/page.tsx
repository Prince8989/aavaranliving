import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { displayStatus } from "@/lib/orders";

export const metadata: Metadata = { title: "Order details", robots: { index: false, follow: false } };

export default async function OrderDetailPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const user = await requireUser(`/account/orders/${number}`);
  // Object-level authorization: the order must belong to the signed-in user, otherwise 404.
  const email = (await db.user.findUniqueOrThrow({ where: { id: user.id }, select: { email: true } })).email;
  const order = await db.order.findFirst({
    where: { number, OR: [{ userId: user.id }, { email }] },
    include: { items: true, shipments: { orderBy: { shippedAt: "desc" } } },
  });
  if (!order) notFound();
  const addr = order.shippingAddress as Record<string, unknown> | null;

  return (
    <div className="container-site max-w-3xl py-20 lg:py-28">
      <Link href="/account" className="label text-walnut hover:underline">
        ← Your account
      </Link>
      <h1 className="mt-8 font-serif text-5xl">Order {order.number}</h1>
      <p className="mt-3 text-muted">
        Placed {order.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} ·{" "}
        <strong className="font-medium text-ink">{displayStatus(order.paymentStatus, order.fulfillmentStatus)}</strong>
      </p>

      <ul className="mt-12 divide-y divide-ink/10 border-y border-ink/10">
        {order.items.map((i) => (
          <li key={i.id} className="flex justify-between gap-4 py-4">
            <div>
              <p className="font-serif text-lg">{i.productName}</p>
              <p className="text-sm text-muted">
                {i.variantLabel} × {i.quantity}
              </p>
            </div>
            <p>{formatMoney(i.lineTotal, order.currency)}</p>
          </li>
        ))}
      </ul>
      <dl className="mt-6 space-y-2 text-sm">
        <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{formatMoney(order.subtotal, order.currency)}</dd></div>
        <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd>{formatMoney(order.shippingTotal, order.currency)}</dd></div>
        {order.taxTotal > 0 && <div className="flex justify-between"><dt className="text-muted">Tax</dt><dd>{formatMoney(order.taxTotal, order.currency)}</dd></div>}
        <div className="flex justify-between border-t border-ink/10 pt-2 text-base"><dt>Total</dt><dd>{formatMoney(order.total, order.currency)} {order.currency}</dd></div>
      </dl>

      {order.shipments.length > 0 && (
        <section className="mt-12">
          <h2 className="font-serif text-2xl">Tracking</h2>
          {order.shipments.map((s) => (
            <p key={s.id} className="mt-3 text-sm">
              {s.carrier}: {s.trackingUrl ? <a href={s.trackingUrl} className="underline" rel="noopener noreferrer">{s.trackingNumber}</a> : s.trackingNumber}
            </p>
          ))}
        </section>
      )}
      {addr && (
        <section className="mt-12">
          <h2 className="font-serif text-2xl">Delivery address</h2>
          <pre className="mt-3 whitespace-pre-wrap font-sans text-sm text-muted">{formatAddress(addr)}</pre>
        </section>
      )}
    </div>
  );
}

function formatAddress(a: Record<string, unknown>): string {
  const inner = (a.address as Record<string, unknown> | undefined) ?? a;
  return [a.name, inner.line1, inner.line2, [inner.city, inner.state, inner.postal_code ?? inner.postalCode].filter(Boolean).join(" "), inner.country]
    .filter((x) => typeof x === "string" && x)
    .join("\n");
}
