import Link from "next/link";
import { db } from "@/lib/db";
import { orderWhere } from "@/lib/admin/orders";
import { formatMoney } from "@/lib/money";
import { displayStatus } from "@/lib/orders";
import { Badge, PageTitle, Table } from "@/components/admin/ui";

const PAGE = 50;
export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const { q, status, page: pageRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);
  const where = orderWhere(q, status);
  const [orders, total] = await Promise.all([
    db.order.findMany({ where, orderBy: { createdAt: "desc" }, take: PAGE, skip: (page - 1) * PAGE }),
    db.order.count({ where }),
  ]);
  const qs = new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}) }).toString();

  return (
    <>
      <PageTitle
        title="Orders"
        actions={
          <a href={`/admin/orders/export${qs ? `?${qs}` : ""}`} className="label border border-obsidian px-4 py-2.5">
            Export CSV
          </a>
        }
      />
      <form className="mb-6 flex flex-wrap gap-3" role="search">
        <label className="sr-only" htmlFor="q">Search orders</label>
        <input id="q" name="q" defaultValue={q} placeholder="Order no., email or name" className="border border-ink/25 bg-white px-3 py-2 text-sm" />
        <label className="sr-only" htmlFor="status">Status</label>
        <select id="status" name="status" defaultValue={status ?? ""} className="border border-ink/25 bg-white px-3 py-2 text-sm">
          <option value="">All</option>
          <option value="pending_payment">Pending Payment</option>
          <option value="paid">Paid (to fulfil)</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
          <option value="refunded">Refunded</option>
        </select>
        <button className="label border border-obsidian px-4 py-2">Filter</button>
      </form>
      <Table head={["Order", "Date", "Customer", "Country", "Total", "Payment", "Fulfilment", "Status"]}>
        {orders.map((o) => (
          <tr key={o.id}>
            <td className="px-4 py-3">
              <Link href={`/admin/orders/${o.id}`} className="underline underline-offset-2">{o.number}</Link>
            </td>
            <td className="px-4 py-3">{o.createdAt.toLocaleString("en-GB")}</td>
            <td className="px-4 py-3">{o.customerName ?? o.email}</td>
            <td className="px-4 py-3">{o.shippingCountry}</td>
            <td className="px-4 py-3">{formatMoney(o.total, o.currency)}</td>
            <td className="px-4 py-3"><Badge tone={o.paymentStatus === "PAID" ? "good" : o.paymentStatus === "PENDING" ? "warn" : "neutral"}>{o.paymentStatus}</Badge></td>
            <td className="px-4 py-3"><Badge>{o.fulfillmentStatus}</Badge></td>
            <td className="px-4 py-3">{displayStatus(o.paymentStatus, o.fulfillmentStatus)}</td>
          </tr>
        ))}
      </Table>
      <p className="mt-4 text-sm text-muted">
        {total} orders · page {page} of {Math.max(1, Math.ceil(total / PAGE))}
        {page * PAGE < total && (
          <Link className="ml-4 underline" href={`/admin/orders?${new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}), page: String(page + 1) })}`}>
            Next →
          </Link>
        )}
      </p>
    </>
  );
}
