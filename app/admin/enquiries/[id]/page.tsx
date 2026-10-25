import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageTitle } from "@/components/admin/ui";
import { enquiryStatusAction } from "../../actions";

export default async function EnquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = await db.enquiry.findUnique({ where: { id }, include: { product: { select: { name: true, slug: true } } } });
  if (!e) notFound();
  const details = (e.details ?? {}) as Record<string, string>;
  return (
    <>
      <PageTitle title={`${e.type.replace("_", " ")} enquiry`} />
      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <section className="space-y-4 border border-ink/10 bg-white p-6 text-sm">
          <p><strong>{e.name}</strong> · <a className="underline" href={`mailto:${e.email}`}>{e.email}</a> {e.phone && `· ${e.phone}`}</p>
          <p className="text-muted">{[e.company, e.country].filter(Boolean).join(" · ")} · {e.createdAt.toLocaleString("en-GB")}</p>
          {e.subject && <p><strong>Subject:</strong> {e.subject}</p>}
          <p className="whitespace-pre-wrap">{e.message}</p>
          {Object.keys(details).length > 0 && (
            <dl className="grid grid-cols-[10rem_1fr] gap-2 border-t border-ink/10 pt-4">
              {Object.entries(details).filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className="contents"><dt className="text-muted">{k}</dt><dd className="whitespace-pre-wrap">{String(v)}</dd></div>
              ))}
            </dl>
          )}
          {e.referenceImageUrl && (
            <p><a className="underline" href={e.referenceImageUrl} target="_blank" rel="noopener noreferrer">View reference image</a></p>
          )}
        </section>
        <form action={enquiryStatusAction} className="space-y-3 border border-ink/10 bg-white p-6">
          <input type="hidden" name="id" value={e.id} />
          <label className="block text-xs uppercase tracking-wider text-muted" htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={e.status} className="w-full border border-ink/25 px-3 py-2 text-sm">
            <option value="NEW">New</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="CLOSED">Closed</option>
          </select>
          <button className="label bg-obsidian px-4 py-2.5 text-ivory">Update</button>
        </form>
      </div>
    </>
  );
}
