"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveProductAction, uploadImageAction } from "../../actions";
import { CURRENCIES } from "@/lib/markets";
import { feetToCm } from "@/lib/units";
import { inputCls, labelCls } from "@/components/admin/ui";

type Cur = (typeof CURRENCIES)[number];
type V = { id?: string; sku: string; label: string; lengthCm: string; widthCm: string; weightGrams: string; stock: string; isActive: boolean; prices: Record<Cur, string> };
type Img = { url: string; alt: string; kind: "GALLERY" | "TEXTURE" | "ROOM" };
export type EditorProduct = {
  id?: string;
  name: string; slug: string; sku: string; description: string; material: string; construction: string; countryOfOrigin: string;
  colour: string; pattern: string; pileHeightMm: string; careInstructions: string; status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  featured: boolean; featuredRank: string; seoTitle: string; seoDescription: string; isSample: boolean; collectionIds: string[];
  variants: V[]; images: Img[];
};

const blankVariant = (): V => ({ sku: "", label: "", lengthCm: "", widthCm: "", weightGrams: "", stock: "0", isActive: true, prices: { USD: "", GBP: "", EUR: "", INR: "" } });
const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/** "5 × 8 ft" → width/length in cm, using exact conversion (1 ft = 30.48 cm). */
function parseFeetLabel(label: string) {
  const m = label.match(/(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)\s*ft/i);
  return m ? { widthCm: String(feetToCm(Number(m[1]))), lengthCm: String(feetToCm(Number(m[2]))) } : null;
}

export function ProductEditor({ initial, collections }: { initial: EditorProduct | null; collections: { id: string; name: string }[] }) {
  const router = useRouter();
  const [p, setP] = useState<EditorProduct>(
    initial ?? {
      name: "", slug: "", sku: "", description: "", material: "", construction: "", countryOfOrigin: "India", colour: "", pattern: "",
      pileHeightMm: "", careInstructions: "", status: "DRAFT", featured: false, featuredRank: "", seoTitle: "", seoDescription: "",
      isSample: false, collectionIds: [], variants: [blankVariant()], images: [],
    }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);

  const set = <K extends keyof EditorProduct>(k: K, v: EditorProduct[K]) => setP((prev) => ({ ...prev, [k]: v }));
  const setVariant = (i: number, patch: Partial<V>) => setP((prev) => ({ ...prev, variants: prev.variants.map((v, j) => (j === i ? { ...v, ...patch } : v)) }));
  const setImage = (i: number, patch: Partial<Img>) => setP((prev) => ({ ...prev, images: prev.images.map((im, j) => (j === i ? { ...im, ...patch } : im)) }));
  const err = (k: string) => errors[k] && <p className="mt-1 text-xs text-red-800" role="alert">{errors[k]}</p>;

  const save = () =>
    start(async () => {
      setMessage(null);
      const res = await saveProductAction({
        ...p,
        pileHeightMm: p.pileHeightMm ? Number(p.pileHeightMm) : null,
        featuredRank: p.featuredRank ? Number(p.featuredRank) : null,
        variants: p.variants.map((v) => ({ ...v, lengthCm: Number(v.lengthCm), widthCm: Number(v.widthCm), weightGrams: v.weightGrams ? Number(v.weightGrams) : null, stock: Number(v.stock) })),
      });
      setErrors(res.errors ?? {});
      setMessage(res.message ?? null);
      if (res.ok && res.id) {
        if (!p.id) router.replace(`/admin/products/${res.id}`);
        else router.refresh();
        set("id", res.id);
      }
    });

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.set("file", file);
      const res = await uploadImageAction(fd);
      if (res.ok && res.url) setP((prev) => ({ ...prev, images: [...prev.images, { url: res.url!, alt: "", kind: "GALLERY" }] }));
      else setMessage(res.message ?? "Upload failed.");
    }
    setUploading(false);
  };

  const text = (k: keyof EditorProduct, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className={labelCls} htmlFor={`p-${k}`}>{label}</label>
      <input id={`p-${k}`} className={inputCls} value={String(p[k] ?? "")} onChange={(e) => set(k, e.target.value as never)} {...extra} />
      {err(k)}
    </div>
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="space-y-10 pb-24"
    >
      <section className="grid gap-4 border border-ink/10 bg-white p-6 md:grid-cols-2">
        <h2 className="font-serif text-2xl md:col-span-2">Details</h2>
        <div>
          <label className={labelCls} htmlFor="p-name">Name</label>
          <input id="p-name" className={inputCls} value={p.name} onChange={(e) => setP((prev) => ({ ...prev, name: e.target.value, slug: prev.id ? prev.slug : slugify(e.target.value) }))} required />
          {err("name")}
        </div>
        {text("slug", "URL slug (/products/…)")}
        {text("sku", "Product SKU")}
        <div>
          <label className={labelCls} htmlFor="p-status">Publication status</label>
          <select id="p-status" className={inputCls} value={p.status} onChange={(e) => set("status", e.target.value as EditorProduct["status"])}>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className={labelCls} htmlFor="p-description">Description</label>
          <textarea id="p-description" rows={5} className={inputCls} value={p.description} onChange={(e) => set("description", e.target.value)} />
          {err("description")}
        </div>
        <p className="text-xs text-muted md:col-span-2">Only enter verified specifications. Leave a field blank rather than guessing.</p>
        {text("material", "Material")}
        {text("construction", "Construction technique", { placeholder: "Hand-knotted, Hand-tufted, Flatweave…" })}
        {text("countryOfOrigin", "Country of origin")}
        {text("colour", "Colour")}
        {text("pattern", "Pattern")}
        {text("pileHeightMm", "Pile height (mm)", { inputMode: "numeric" })}
        <div className="md:col-span-2">
          <label className={labelCls} htmlFor="p-care">Care instructions</label>
          <textarea id="p-care" rows={3} className={inputCls} value={p.careInstructions} onChange={(e) => set("careInstructions", e.target.value)} />
        </div>
        <fieldset className="md:col-span-2">
          <legend className={labelCls}>Collections</legend>
          <div className="flex flex-wrap gap-4">
            {collections.map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={p.collectionIds.includes(c.id)}
                  onChange={(e) => set("collectionIds", e.target.checked ? [...p.collectionIds, c.id] : p.collectionIds.filter((x) => x !== c.id))}
                />
                {c.name}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={p.featured} onChange={(e) => set("featured", e.target.checked)} /> Feature on homepage
        </label>
        {text("featuredRank", "Homepage order (1 = first)", { inputMode: "numeric" })}
        <label className="flex items-center gap-2 text-sm md:col-span-2">
          <input type="checkbox" checked={p.isSample} onChange={(e) => set("isSample", e.target.checked)} /> Sample product (hidden in production)
        </label>
      </section>

      <section className="border border-ink/10 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-2xl">Sizes, stock &amp; prices</h2>
          <button type="button" className="label border border-obsidian px-3 py-2" onClick={() => set("variants", [...p.variants, blankVariant()])}>
            Add size
          </button>
        </div>
        {err("variants")}
        <p className="mb-4 text-xs text-muted">Prices are entered per currency (no automatic conversion). Leave a currency blank if this size is not sold in it.</p>
        <div className="space-y-6">
          {p.variants.map((v, i) => (
            <fieldset key={v.id ?? i} className="grid gap-3 border-t border-ink/10 pt-4 sm:grid-cols-4 lg:grid-cols-8">
              <legend className="sr-only">Size {i + 1}</legend>
              <div className="sm:col-span-2">
                <label className={labelCls} htmlFor={`v${i}-label`}>Label</label>
                <input
                  id={`v${i}-label`}
                  className={inputCls}
                  value={v.label}
                  placeholder="5 × 8 ft"
                  onChange={(e) => setVariant(i, { label: e.target.value })}
                  onBlur={(e) => {
                    const dims = parseFeetLabel(e.target.value);
                    if (dims && !v.lengthCm && !v.widthCm) setVariant(i, dims);
                  }}
                />
                {err(`variants.${i}.label`)}
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls} htmlFor={`v${i}-sku`}>SKU</label>
                <input id={`v${i}-sku`} className={inputCls} value={v.sku} onChange={(e) => setVariant(i, { sku: e.target.value })} />
                {err(`variants.${i}.sku`)}
              </div>
              <div>
                <label className={labelCls} htmlFor={`v${i}-w`}>Width cm</label>
                <input id={`v${i}-w`} inputMode="numeric" className={inputCls} value={v.widthCm} onChange={(e) => setVariant(i, { widthCm: e.target.value })} />
                {err(`variants.${i}.widthCm`)}
              </div>
              <div>
                <label className={labelCls} htmlFor={`v${i}-l`}>Length cm</label>
                <input id={`v${i}-l`} inputMode="numeric" className={inputCls} value={v.lengthCm} onChange={(e) => setVariant(i, { lengthCm: e.target.value })} />
                {err(`variants.${i}.lengthCm`)}
              </div>
              <div>
                <label className={labelCls} htmlFor={`v${i}-wt`}>Weight g</label>
                <input id={`v${i}-wt`} inputMode="numeric" className={inputCls} value={v.weightGrams} onChange={(e) => setVariant(i, { weightGrams: e.target.value })} />
              </div>
              <div>
                <label className={labelCls} htmlFor={`v${i}-s`}>Stock</label>
                <input id={`v${i}-s`} inputMode="numeric" className={inputCls} value={v.stock} onChange={(e) => setVariant(i, { stock: e.target.value })} />
              </div>
              {CURRENCIES.map((c) => (
                <div key={c} className="sm:col-span-2 lg:col-span-2">
                  <label className={labelCls} htmlFor={`v${i}-${c}`}>Price {c}</label>
                  <input id={`v${i}-${c}`} inputMode="decimal" className={inputCls} value={v.prices[c]} onChange={(e) => setVariant(i, { prices: { ...v.prices, [c]: e.target.value } })} />
                  {err(`variants.${i}.prices.${c}`)}
                </div>
              ))}
              <div className="flex items-end gap-4 sm:col-span-4 lg:col-span-8">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={v.isActive} onChange={(e) => setVariant(i, { isActive: e.target.checked })} /> Active
                </label>
                {p.variants.length > 1 && (
                  <button type="button" className="text-sm text-red-800 underline" onClick={() => set("variants", p.variants.filter((_, j) => j !== i))}>
                    Remove size
                  </button>
                )}
              </div>
            </fieldset>
          ))}
        </div>
      </section>

      <section className="border border-ink/10 bg-white p-6">
        <h2 className="mb-4 font-serif text-2xl">Images</h2>
        <p className="mb-4 text-xs text-muted">Use only photography you own or are licensed to use. The first image is the main image.</p>
        <label className="label inline-block cursor-pointer border border-obsidian px-4 py-2">
          {uploading ? "Uploading…" : "Upload images"}
          <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="sr-only" onChange={(e) => upload(e.target.files)} disabled={uploading} />
        </label>
        <ul className="mt-6 space-y-4">
          {p.images.map((img, i) => (
            <li key={img.url + i} className="grid items-start gap-3 border-t border-ink/10 pt-4 sm:grid-cols-[6rem_1fr_10rem_auto]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="h-24 w-24 object-cover" />
              <div>
                <label className={labelCls} htmlFor={`img${i}-alt`}>Alt text</label>
                <input id={`img${i}-alt`} className={inputCls} value={img.alt} onChange={(e) => setImage(i, { alt: e.target.value })} placeholder="Describe the image" />
                {err(`images.${i}.alt`)}
              </div>
              <div>
                <label className={labelCls} htmlFor={`img${i}-kind`}>Type</label>
                <select id={`img${i}-kind`} className={inputCls} value={img.kind} onChange={(e) => setImage(i, { kind: e.target.value as Img["kind"] })}>
                  <option value="GALLERY">Product</option>
                  <option value="TEXTURE">Texture close-up</option>
                  <option value="ROOM">Room setting</option>
                </select>
              </div>
              <div className="flex gap-2 pt-5 text-sm">
                <button type="button" disabled={i === 0} onClick={() => set("images", [p.images[i], ...p.images.filter((_, j) => j !== i)])} className="underline disabled:opacity-40">
                  Make main
                </button>
                <button type="button" className="text-red-800 underline" onClick={() => set("images", p.images.filter((_, j) => j !== i))}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-4 border border-ink/10 bg-white p-6 md:grid-cols-2">
        <h2 className="font-serif text-2xl md:col-span-2">SEO</h2>
        {text("seoTitle", "SEO title (≤ 70 chars)", { maxLength: 70 })}
        {text("seoDescription", "Meta description (≤ 160 chars)", { maxLength: 160 })}
      </section>

      <div className="fixed inset-x-0 bottom-0 z-10 flex items-center justify-end gap-4 border-t border-ink/10 bg-white/95 px-6 py-4 lg:left-56">
        {message && <p role="status" className="text-sm">{message}</p>}
        <button type="submit" disabled={pending} className="label bg-obsidian px-6 py-3 text-ivory disabled:opacity-50">
          {pending ? "Saving…" : "Save product"}
        </button>
      </div>
    </form>
  );
}
