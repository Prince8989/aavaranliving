import { db } from "@/lib/db";
import { PageTitle, inputCls, labelCls } from "@/components/admin/ui";
import { saveCollectionAction } from "../actions";

export default async function AdminCollections() {
  const collections = await db.collection.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { products: true } } } });
  return (
    <>
      <PageTitle title="Collections" />
      <div className="space-y-8">
        {collections.map((c) => (
          <form key={c.id} action={saveCollectionAction} className="grid gap-4 border border-ink/10 bg-white p-6 md:grid-cols-2">
            <input type="hidden" name="id" value={c.id} />
            <p className="text-xs text-muted md:col-span-2">/collections/{c.slug} · {c._count.products} products</p>
            <div><label className={labelCls} htmlFor={`${c.id}-name`}>Name</label><input id={`${c.id}-name`} name="name" defaultValue={c.name} className={inputCls} /></div>
            <div><label className={labelCls} htmlFor={`${c.id}-tag`}>Tagline</label><input id={`${c.id}-tag`} name="tagline" defaultValue={c.tagline ?? ""} className={inputCls} /></div>
            <div className="md:col-span-2"><label className={labelCls} htmlFor={`${c.id}-desc`}>Description</label><textarea id={`${c.id}-desc`} name="description" rows={3} defaultValue={c.description ?? ""} className={inputCls} /></div>
            <div><label className={labelCls} htmlFor={`${c.id}-st`}>SEO title</label><input id={`${c.id}-st`} name="seoTitle" maxLength={70} defaultValue={c.seoTitle ?? ""} className={inputCls} /></div>
            <div><label className={labelCls} htmlFor={`${c.id}-sd`}>SEO description</label><input id={`${c.id}-sd`} name="seoDescription" maxLength={160} defaultValue={c.seoDescription ?? ""} className={inputCls} /></div>
            <div><label className={labelCls} htmlFor={`${c.id}-so`}>Order</label><input id={`${c.id}-so`} name="sortOrder" type="number" defaultValue={c.sortOrder} className={inputCls} /></div>
            <label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" name="isPublished" defaultChecked={c.isPublished} /> Published</label>
            <div className="md:col-span-2"><button className="label bg-obsidian px-4 py-2.5 text-ivory">Save {c.name}</button></div>
          </form>
        ))}
      </div>
    </>
  );
}
