import Link from "next/link";
import { db } from "@/lib/db";
import { AdminLink, Badge, PageTitle, Table } from "@/components/admin/ui";

export default async function AdminJournal() {
  const articles = await db.journalArticle.findMany({ orderBy: { updatedAt: "desc" } });
  return (
    <>
      <PageTitle title="Journal" actions={<AdminLink href="/admin/journal/new">New article</AdminLink>} />
      <Table head={["Title", "Topic", "Status", "Updated"]}>
        {articles.map((a) => (
          <tr key={a.id}>
            <td className="px-4 py-3"><Link href={`/admin/journal/${a.id}`} className="underline underline-offset-2">{a.title}</Link></td>
            <td className="px-4 py-3">{a.topic}</td>
            <td className="px-4 py-3"><Badge tone={a.status === "PUBLISHED" ? "good" : "warn"}>{a.status}</Badge></td>
            <td className="px-4 py-3">{a.updatedAt.toLocaleDateString("en-GB")}</td>
          </tr>
        ))}
      </Table>
    </>
  );
}
