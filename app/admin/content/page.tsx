import { db } from "@/lib/db";
import { DEFAULT_CONTENT } from "@/lib/content";
import { PageTitle, inputCls, labelCls } from "@/components/admin/ui";
import { saveContentAction } from "../actions";

const POLICIES = [
  { key: "policy-shipping", label: "Shipping Policy" },
  { key: "policy-returns", label: "Return Policy" },
  { key: "policy-privacy", label: "Privacy Policy" },
  { key: "policy-terms", label: "Terms and Conditions" },
];

export default async function AdminContent({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const { notice } = await searchParams;
  const rows = await db.contentBlock.findMany();
  const saved = Object.fromEntries(rows.map((r) => [r.key, r.value as Record<string, unknown>]));

  return (
    <>
      <PageTitle title="Content" />
      {notice && <p role="status" className="mb-6 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{notice}</p>}
      <p className="mb-8 max-w-3xl text-sm text-muted">
        Brand and homepage copy. Lists (e.g. paragraphs) are separated by a blank line. Homepage featured products are chosen on each product (“Feature on
        homepage”).
      </p>
      <div className="space-y-8">
        {Object.entries(DEFAULT_CONTENT).map(([key, defaults]) => {
          const current = { ...defaults, ...(saved[key] ?? {}) } as Record<string, unknown>;
          return (
            <form key={key} action={saveContentAction} className="space-y-4 border border-ink/10 bg-white p-6">
              <input type="hidden" name="key" value={key} />
              <h2 className="font-serif text-2xl capitalize">{key}</h2>
              {Object.entries(defaults).map(([field, def]) => {
                const v = current[field];
                const value = Array.isArray(v) ? v.join("\n\n") : String(v ?? "");
                const long = Array.isArray(def) || String(def).length > 80;
                return (
                  <div key={field}>
                    <label className={labelCls} htmlFor={`${key}-${field}`}>{field}</label>
                    {long ? (
                      <textarea id={`${key}-${field}`} name={field} rows={Array.isArray(def) ? 8 : 3} defaultValue={value} className={inputCls} />
                    ) : (
                      <input id={`${key}-${field}`} name={field} defaultValue={value} className={inputCls} />
                    )}
                  </div>
                );
              })}
              <button className="label bg-obsidian px-4 py-2.5 text-ivory">Save {key}</button>
            </form>
          );
        })}

        <h2 className="pt-6 font-serif text-3xl">Legal &amp; policy pages</h2>
        <p className="max-w-3xl text-sm text-muted">
          These must be written or approved by you (ideally with legal advice) before launch. Until saved, the public page says the policy is being finalised.
        </p>
        {POLICIES.map((p) => (
          <form key={p.key} action={saveContentAction} className="space-y-4 border border-ink/10 bg-white p-6">
            <input type="hidden" name="key" value={p.key} />
            <label className="font-serif text-2xl" htmlFor={p.key}>{p.label}</label>
            <textarea id={p.key} name="body" rows={10} defaultValue={String(saved[p.key]?.body ?? "")} className={`${inputCls} font-mono`} />
            <button className="label bg-obsidian px-4 py-2.5 text-ivory">Save {p.label}</button>
          </form>
        ))}
      </div>
    </>
  );
}
