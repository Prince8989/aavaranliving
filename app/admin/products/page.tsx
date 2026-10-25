import Link from "next/link";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { AdminLink, Badge, PageTitle, Table } from "@/components/admin/ui";

export default async function AdminProducts({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const { q, status } = await searchParams;
  const products = await db.product.findMany({
    where: {
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }] } : {}),
      ...(status && ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status) ? { status: status as "DRAFT" } : {}),
    },
    include: { variants: { include: { prices: { where: { currency: "USD" } } } }, collections: { include: { collection: true } } },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  return (
    <>
      <PageTitle title="Products" actions={<AdminLink href="/admin/products/new">New product</AdminLink>} />
      <form className="mb-6 flex flex-wrap gap-3" role="search">
        <label className="sr-only" htmlFor="q">Search products</label>
        <input id="q" name="q" defaultValue={q} placeholder="Search name or SKU" className="border border-ink/25 bg-white px-3 py-2 text-sm" />
        <label className="sr-only" htmlFor="status">Status</label>
        <select id="status" name="status" defaultValue={status ?? ""} className="border border-ink/25 bg-white px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="PUBLISHED">Published</option>
          <option value="DRAFT">Draft</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <button className="label border border-obsidian px-4 py-2">Filter</button>
      </form>
      <Table head={["Product", "SKU", "Collection", "Sizes", "Stock", "From (USD)", "Status"]}>
        {products.map((p) => {
          const prices = p.variants.flatMap((v) => v.prices.map((pr) => pr.amount));
          return (
            <tr key={p.id}>
              <td className="px-4 py-3">
                <Link href={`/admin/products/${p.id}`} className="underline underline-offset-2">{p.name}</Link>
                {p.isSample && <Badge tone="warn">Sample</Badge>}
                {p.featured && <span className="ml-2 text-xs text-walnut">★ Featured</span>}
              </td>
              <td className="px-4 py-3 font-mono text-xs">{p.sku}</td>
              <td className="px-4 py-3">{p.collections.map((c) => c.collection.name).join(", ") || "—"}</td>
              <td className="px-4 py-3">{p.variants.length}</td>
              <td className="px-4 py-3">{p.variants.reduce((n, v) => n + v.stock, 0)}</td>
              <td className="px-4 py-3">{prices.length ? formatMoney(Math.min(...prices), "USD") : "—"}</td>
              <td className="px-4 py-3">
                <Badge tone={p.status === "PUBLISHED" ? "good" : p.status === "DRAFT" ? "warn" : "neutral"}>{p.status}</Badge>
              </td>
            </tr>
          );
        })}
      </Table>
    </>
  );
}
