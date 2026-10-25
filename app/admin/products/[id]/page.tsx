import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { fromMinorUnits } from "@/lib/money";
import { CURRENCIES } from "@/lib/markets";
import { PageTitle } from "@/components/admin/ui";
import { ProductEditor, type EditorProduct } from "./ProductEditor";
import { deleteProductAction } from "../../actions";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const collections = await db.collection.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } });

  let initial: EditorProduct | null = null;
  if (id !== "new") {
    const p = await db.product.findUnique({
      where: { id },
      include: { variants: { orderBy: { sortOrder: "asc" }, include: { prices: true } }, images: { orderBy: { sortOrder: "asc" } }, collections: true },
    });
    if (!p) notFound();
    initial = {
      id: p.id,
      name: p.name,
      slug: p.slug,
      sku: p.sku,
      description: p.description,
      material: p.material ?? "",
      construction: p.construction ?? "",
      countryOfOrigin: p.countryOfOrigin ?? "",
      colour: p.colour ?? "",
      pattern: p.pattern ?? "",
      pileHeightMm: p.pileHeightMm?.toString() ?? "",
      careInstructions: p.careInstructions ?? "",
      status: p.status,
      featured: p.featured,
      featuredRank: p.featuredRank?.toString() ?? "",
      seoTitle: p.seoTitle ?? "",
      seoDescription: p.seoDescription ?? "",
      isSample: p.isSample,
      collectionIds: p.collections.map((c) => c.collectionId),
      variants: p.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        label: v.label,
        lengthCm: String(v.lengthCm),
        widthCm: String(v.widthCm),
        weightGrams: v.weightGrams?.toString() ?? "",
        stock: String(v.stock),
        isActive: v.isActive,
        prices: Object.fromEntries(CURRENCIES.map((c) => [c, (() => { const pr = v.prices.find((x) => x.currency === c); return pr ? fromMinorUnits(pr.amount) : ""; })()])) as Record<(typeof CURRENCIES)[number], string>,
      })),
      images: p.images.map((i) => ({ url: i.url, alt: i.alt, kind: i.kind })),
    };
  }

  return (
    <>
      <PageTitle
        title={initial ? initial.name : "New product"}
        actions={
          initial && (
            <div className="flex items-center gap-4">
              <Link href={`/products/${initial.slug}`} className="text-sm underline" target="_blank">
                View on site
              </Link>
              <form action={deleteProductAction}>
                <input type="hidden" name="id" value={initial.id} />
                <button className="text-sm text-red-800 underline" type="submit">
                  Delete / archive
                </button>
              </form>
            </div>
          )
        }
      />
      <ProductEditor initial={initial} collections={collections} />
    </>
  );
}
