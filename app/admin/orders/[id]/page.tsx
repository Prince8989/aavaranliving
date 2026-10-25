import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatMoney, fromMinorUnits } from "@/lib/money";
import { displayStatus } from "@/lib/orders";
import { canTransition } from "@/lib/admin/orders";
import { Badge, PageTitle, inputCls, labelCls } from "@/components/admin/ui";
import { fulfillmentAction, orderNoteAction, refundAction, shipmentAction } from "../../actions";
import type { FulfillmentStatus } from "@/lib/generated/prisma/enums";

export default async function AdminOrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; notice?: string }> }) {
  const { id } = await params;
  const { error, notice } = await searchParams;
  const order = await db.order.findUnique({
    where: { id },
    include: { items: true, payments: true, shipments: true, reservations: true },
  });
  if (!order) notFound();
  const log = await db.auditLog.findMany({ where: { entity: "Order", entityId: id }, orderBy: { createdAt: "desc" }, take: 30 });
  const paid = order.payments.find((p) => ["PAID", "PARTIALLY_REFUNDED"].includes(p.status));
  const nextStates = (["PROCESSING", "DELIVERED", "CANCELLED"] as FulfillmentStatus[]).filter((s) => canTransition(order.fulfillmentStatus, s));

  return (
    <>
      <PageTitle title={`Order ${order.number}`} actions={<Badge tone="neutral">{displayStatus(order.paymentStatus, order.fulfillmentStatus)}</Badge>} />
      {error && <p role="alert" className="mb-6 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="mb-6 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{notice}</p>}
      {order.notes && <p className="mb-6 bg-amber-50 px-4 py-3 text-sm text-amber-900">{order.notes}</p>}

      <div className="grid gap-8 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-8">
          <section className="border border-ink/10 bg-white p-6">
            <h2 className="mb-4 font-serif text-2xl">Items</h2>
            <ul className="divide-y divide-ink/10 text-sm">
              {order.items.map((i) => (
                <li key={i.id} className="flex justify-between py-3">
                  <span>
                    {i.productName} — {i.variantLabel} <span className="text-muted">({i.sku}) × {i.quantity}</span>
                  </span>
                  <span>{formatMoney(i.lineTotal, order.currency)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1 border-t border-ink/10 pt-4 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(order.subtotal, order.currency)}</dd></div>
              <div className="flex justify-between"><dt>Shipping</dt><dd>{formatMoney(order.shippingTotal, order.currency)}</dd></div>
              <div className="flex justify-between"><dt>Tax</dt><dd>{formatMoney(order.taxTotal, order.currency)}</dd></div>
              <div className="flex justify-between font-medium"><dt>Total</dt><dd>{formatMoney(order.total, order.currency)} {order.currency}</dd></div>
            </dl>
          </section>

          <section className="grid gap-6 border border-ink/10 bg-white p-6 md:grid-cols-2">
            <div>
              <h2 className="mb-3 font-serif text-xl">Customer</h2>
              <p className="text-sm">{order.customerName}</p>
              <p className="text-sm">{order.email}</p>
              <p className="text-sm">{order.phone}</p>
            </div>
            <div>
              <h2 className="mb-3 font-serif text-xl">Shipping address</h2>
              <pre className="whitespace-pre-wrap font-sans text-sm">{JSON.stringify(order.shippingAddress, null, 2)}</pre>
            </div>
            {order.billingAddress && (
              <div className="md:col-span-2">
                <h2 className="mb-3 font-serif text-xl">Billing</h2>
                <pre className="whitespace-pre-wrap font-sans text-sm">{JSON.stringify(order.billingAddress, null, 2)}</pre>
              </div>
            )}
          </section>

          <section className="border border-ink/10 bg-white p-6">
            <h2 className="mb-3 font-serif text-xl">Activity</h2>
            <ul className="space-y-1 text-xs text-muted">
              {log.map((l) => (
                <li key={l.id}>
                  {l.createdAt.toLocaleString("en-GB")} — {l.action} {l.data ? JSON.stringify(l.data) : ""}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <div className="space-y-8">
          <section className="border border-ink/10 bg-white p-6 text-sm">
            <h2 className="mb-3 font-serif text-xl">Payment</h2>
            <p>
              Status: <Badge tone={order.paymentStatus === "PAID" ? "good" : "warn"}>{order.paymentStatus}</Badge>
            </p>
            {order.payments.map((p) => (
              <p key={p.id} className="mt-2 break-all text-xs text-muted">
                {p.provider} · {p.status} · ref {p.providerRef} {p.providerPaymentId ? `· ${p.providerPaymentId}` : ""} · refunded {formatMoney(p.amountRefunded, order.currency)}
              </p>
            ))}
          </section>

          <section className="border border-ink/10 bg-white p-6">
            <h2 className="mb-3 font-serif text-xl">Fulfilment</h2>
            <p className="mb-4 text-sm">
              Current: <Badge>{order.fulfillmentStatus}</Badge>
            </p>
            <div className="flex flex-wrap gap-2">
              {nextStates.map((s) => (
                <form key={s} action={fulfillmentAction}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <input type="hidden" name="to" value={s} />
                  <button className="label border border-obsidian px-3 py-2">Mark {s.toLowerCase()}</button>
                </form>
              ))}
            </div>
            {order.paymentStatus === "PAID" && ["UNFULFILLED", "PROCESSING", "SHIPPED"].includes(order.fulfillmentStatus) && (
              <form action={shipmentAction} className="mt-6 space-y-3 border-t border-ink/10 pt-4">
                <input type="hidden" name="orderId" value={order.id} />
                <div><label className={labelCls} htmlFor="carrier">Carrier</label><input id="carrier" name="carrier" required className={inputCls} /></div>
                <div><label className={labelCls} htmlFor="trackingNumber">Tracking number</label><input id="trackingNumber" name="trackingNumber" required className={inputCls} /></div>
                <div><label className={labelCls} htmlFor="trackingUrl">Tracking URL (https)</label><input id="trackingUrl" name="trackingUrl" type="url" className={inputCls} /></div>
                <button className="label bg-obsidian px-4 py-2.5 text-ivory">Add tracking &amp; notify customer</button>
              </form>
            )}
            {order.shipments.map((s) => (
              <p key={s.id} className="mt-3 text-xs text-muted">
                {s.carrier}: {s.trackingNumber} ({s.shippedAt.toLocaleDateString("en-GB")})
              </p>
            ))}
          </section>

          {paid && (
            <section className="border border-red-200 bg-white p-6">
              <h2 className="mb-3 font-serif text-xl">Refund</h2>
              <p className="mb-3 text-xs text-muted">Processed through {paid.provider}. Remaining refundable: {formatMoney(paid.amount - paid.amountRefunded, order.currency)}.</p>
              <form action={refundAction} className="space-y-3">
                <input type="hidden" name="orderId" value={order.id} />
                <div><label className={labelCls} htmlFor="amount">Amount ({order.currency})</label><input id="amount" name="amount" defaultValue={fromMinorUnits(paid.amount - paid.amountRefunded)} className={inputCls} /></div>
                <div><label className={labelCls} htmlFor="confirm">Type REFUND to confirm</label><input id="confirm" name="confirm" className={inputCls} autoComplete="off" /></div>
                <button className="label bg-red-800 px-4 py-2.5 text-white">Issue refund</button>
              </form>
            </section>
          )}

          <section className="border border-ink/10 bg-white p-6">
            <h2 className="mb-3 font-serif text-xl">Internal notes</h2>
            <form action={orderNoteAction} className="space-y-3">
              <input type="hidden" name="orderId" value={order.id} />
              <label className="sr-only" htmlFor="notes">Notes</label>
              <textarea id="notes" name="notes" rows={4} defaultValue={order.notes ?? ""} className={inputCls} />
              <button className="label border border-obsidian px-4 py-2">Save note</button>
            </form>
          </section>
        </div>
      </div>
    </>
  );
}
