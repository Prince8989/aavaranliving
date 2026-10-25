import { db } from "@/lib/db";
import { PageTitle, Table } from "@/components/admin/ui";

export default async function AdminAudit() {
  const logs = await db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { actor: { select: { email: true } } } });
  return (
    <>
      <PageTitle title="Audit log" />
      <Table head={["When", "Actor", "Action", "Entity", "Details"]}>
        {logs.map((l) => (
          <tr key={l.id}>
            <td className="whitespace-nowrap px-4 py-2">{l.createdAt.toLocaleString("en-GB")}</td>
            <td className="px-4 py-2">{l.actor?.email ?? "system"}</td>
            <td className="px-4 py-2 font-mono text-xs">{l.action}</td>
            <td className="px-4 py-2 text-xs">{l.entity} {l.entityId}</td>
            <td className="max-w-md truncate px-4 py-2 text-xs text-muted">{l.data ? JSON.stringify(l.data) : ""}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
