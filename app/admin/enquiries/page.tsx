import Link from "next/link";
import { db } from "@/lib/db";
import { Badge, PageTitle, Table } from "@/components/admin/ui";

const TYPES = ["GENERAL", "ORDER", "PRODUCT", "DESIGN_COLLABORATION", "TRADE", "BESPOKE"] as const;

export default async function AdminEnquiries({ searchParams }: { searchParams: Promise<{ type?: string; status?: string }> }) {
  const { type, status } = await searchParams;
  const enquiries = await db.enquiry.findMany({
    where: {
      ...(type && (TYPES as readonly string[]).includes(type) ? { type: type as (typeof TYPES)[number] } : {}),
      ...(status && ["NEW", "IN_PROGRESS", "CLOSED"].includes(status) ? { status: status as "NEW" } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <>
      <PageTitle title="Enquiries" />
      <form className="mb-6 flex flex-wrap gap-3">
        <label className="sr-only" htmlFor="type">Type</label>
        <select id="type" name="type" defaultValue={type ?? ""} className="border border-ink/25 bg-white px-3 py-2 text-sm">
          <option value="">All types</option>
          {TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ").toLowerCase()}</option>)}
        </select>
        <label className="sr-only" htmlFor="status">Status</label>
        <select id="status" name="status" defaultValue={status ?? ""} className="border border-ink/25 bg-white px-3 py-2 text-sm">
          <option value="">All statuses</option>
          <option value="NEW">New</option>
          <option value="IN_PROGRESS">In progress</option>
          <option value="CLOSED">Closed</option>
        </select>
        <button className="label border border-obsidian px-4 py-2">Filter</button>
      </form>
      <Table head={["Date", "Type", "Name", "Email", "Country", "Status"]}>
        {enquiries.map((e) => (
          <tr key={e.id}>
            <td className="px-4 py-3">{e.createdAt.toLocaleString("en-GB")}</td>
            <td className="px-4 py-3">{e.type}</td>
            <td className="px-4 py-3"><Link href={`/admin/enquiries/${e.id}`} className="underline underline-offset-2">{e.name}</Link></td>
            <td className="px-4 py-3">{e.email}</td>
            <td className="px-4 py-3">{e.country}</td>
            <td className="px-4 py-3"><Badge tone={e.status === "NEW" ? "warn" : e.status === "CLOSED" ? "neutral" : "good"}>{e.status}</Badge></td>
          </tr>
        ))}
      </Table>
    </>
  );
}
