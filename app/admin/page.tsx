import Link from "next/link";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { displayStatus } from "@/lib/orders";
import { Badge, PageTitle, Stat, Table } from "@/components/admin/ui";
import { isProviderConfigured } from "@/lib/payments/config";
import { emailConfigured } from "@/lib/email/send";
import type { Currency } from "@/lib/generated/prisma/enums";

export default async function AdminDashboard() {
  const [orderCount, pending, products, lowStock, recent, revenue, newEnquiries, shippingRates] = await Promise.all([
    db.order.count({ where: { paymentStatus: { in: ["PAID", "PARTIALLY_REFUNDED"] } } }),
    db.order.count({ where: { paymentStatus: "PAID", fulfillmentStatus: { in: ["UNFULFILLED", "PROCESSING"] } } }),
    db.product.count({ where: { status: { not: "ARCHIVED" } } }),
    db.productVariant.findMany({
      where: { isActive: true, stock: { lte: 1 }, product: { status: "PUBLISHED" } },
      include: { product: { select: { name: true, id: true } } },
      take: 10,
    }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    db.order.groupBy({ by: ["currency"], _sum: { total: true }, where: { paymentStatus: { in: ["PAID", "PARTIALLY_REFUNDED"] } } }),
    db.enquiry.count({ where: { status: "NEW" } }),
    db.shippingRate.count({ where: { isActive: true } }),
  ]);

  const readiness = [
    { label: "Stripe (USD/GBP/EUR)", ok: isProviderConfigured("STRIPE") },
    { label: "Razorpay (INR)", ok: isProviderConfigured("RAZORPAY") },
    { label: "Transactional email", ok: emailConfigured() },
    { label: "Image storage", ok: !!process.env.BLOB_READ_WRITE_TOKEN },
    { label: "Shipping rates configured", ok: shippingRates > 0 },
    { label: "Checkout enabled (STORE_CHECKOUT_ENABLED)", ok: process.env.STORE_CHECKOUT_ENABLED === "true" },
    { label: "Live payments (PAYMENTS_LIVE_MODE)", ok: process.env.PAYMENTS_LIVE_MODE === "true" },
  ];

  return (
    <>
      <PageTitle title="Dashboard" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Paid orders" value={orderCount} />
        <Stat label="To fulfil" value={pending} />
        <Stat label="Products" value={products} />
        <Stat label="New enquiries" value={newEnquiries} />
        <Stat
          label="Revenue"
          value={
            <span className="text-xl">
              {revenue.length ? revenue.map((r) => formatMoney(r._sum.total ?? 0, r.currency as Currency)).join(" · ") : "—"}
            </span>
          }
        />
      </div>

      <div className="mt-10 grid gap-10 xl:grid-cols-[2fr_1fr]">
        <section>
          <h2 className="mb-4 font-serif text-2xl">Recent orders</h2>
          <Table head={["Order", "Customer", "Total", "Status", "Date"]}>
            {recent.map((o) => (
              <tr key={o.id}>
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${o.id}`} className="underline underline-offset-2">
                    {o.number}
                  </Link>
                </td>
                <td className="px-4 py-3">{o.email}</td>
                <td className="px-4 py-3">{formatMoney(o.total, o.currency)}</td>
                <td className="px-4 py-3">
                  <Badge>{displayStatus(o.paymentStatus, o.fulfillmentStatus)}</Badge>
                </td>
                <td className="px-4 py-3">{o.createdAt.toLocaleDateString("en-GB")}</td>
              </tr>
            ))}
          </Table>
        </section>
        <div className="space-y-10">
          <section>
            <h2 className="mb-4 font-serif text-2xl">Launch readiness</h2>
            <ul className="space-y-2 border border-ink/10 bg-white p-5 text-sm">
              {readiness.map((r) => (
                <li key={r.label} className="flex justify-between gap-4">
                  <span>{r.label}</span>
                  <Badge tone={r.ok ? "good" : "warn"}>{r.ok ? "Ready" : "Not set"}</Badge>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="mb-4 font-serif text-2xl">Low stock</h2>
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted">Nothing low.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {lowStock.map((v) => (
                  <li key={v.id} className="flex justify-between">
                    <Link href={`/admin/products/${v.product.id}`} className="underline underline-offset-2">
                      {v.product.name} — {v.label}
                    </Link>
                    <Badge tone={v.stock === 0 ? "bad" : "warn"}>{v.stock}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
