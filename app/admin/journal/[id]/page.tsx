import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { PageTitle, inputCls, labelCls } from "@/components/admin/ui";
import { deleteArticleAction, saveArticleAction } from "../../actions";

export default async function EditArticle({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; notice?: string }> }) {
  const { id } = await params;
  const { error, notice } = await searchParams;
  const a = id === "new" ? null : await db.journalArticle.findUnique({ where: { id } });
  if (id !== "new" && !a) notFound();
  const f = (name: string, label: string, value: string | null | undefined, extra: Record<string, unknown> = {}) => (
    <div>
      <label className={labelCls} htmlFor={name}>{label}</label>
      <input id={name} name={name} defaultValue={value ?? ""} className={inputCls} {...extra} />
    </div>
  );
  return (
    <>
      <PageTitle title={a ? a.title : "New article"} />
      {error && <p role="alert" className="mb-6 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      {notice && <p role="status" className="mb-6 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{notice}</p>}
      <form action={saveArticleAction} className="grid gap-4 border border-ink/10 bg-white p-6 md:grid-cols-2">
        {a && <input type="hidden" name="id" value={a.id} />}
        {f("title", "Title", a?.title, { required: true })}
        {f("slug", "Slug (/journal/…)", a?.slug, { required: true, pattern: "[a-z0-9]+(-[a-z0-9]+)*" })}
        {f("topic", "Topic", a?.topic)}
        <div>
          <label className={labelCls} htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue={a?.status ?? "DRAFT"} className={inputCls}>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
          </select>
        </div>
        <div className="md:col-span-2"><label className={labelCls} htmlFor="excerpt">Excerpt</label><textarea id="excerpt" name="excerpt" rows={2} defaultValue={a?.excerpt ?? ""} className={inputCls} /></div>
        <div className="md:col-span-2">
          <label className={labelCls} htmlFor="body">Body — use “## ” for headings, “- ” for lists, a blank line between paragraphs</label>
          <textarea id="body" name="body" rows={20} defaultValue={a?.body ?? ""} className={`${inputCls} font-mono`} />
        </div>
        {f("coverImage", "Cover image URL (https or /uploads/…)", a?.coverImage)}
        {f("coverAlt", "Cover alt text", a?.coverAlt)}
        {f("seoTitle", "SEO title", a?.seoTitle, { maxLength: 70 })}
        {f("seoDescription", "SEO description", a?.seoDescription, { maxLength: 160 })}
        <div className="md:col-span-2"><button className="label bg-obsidian px-5 py-3 text-ivory">Save article</button></div>
      </form>
      {a && (
        <form action={deleteArticleAction} className="mt-6">
          <input type="hidden" name="id" value={a.id} />
          <button className="text-sm text-red-800 underline">Delete article</button>
        </form>
      )}
    </>
  );
}
