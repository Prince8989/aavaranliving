import Link from "next/link";
import { getFilterFacets, searchProducts, SORTS, type CatalogFilters, type SortKey } from "@/lib/catalog";
import { CURRENCY_META } from "@/lib/markets";
import { getCurrency } from "@/lib/preferences";
import { toMinorUnits } from "@/lib/money";
import { SIZE_BUCKETS } from "@/lib/units";
import { ProductGrid } from "./ProductCard";
import { FilterForm } from "./FilterForm";

export type SearchParams = Record<string, string | string[] | undefined>;

const arr = (v: string | string[] | undefined) => (v == null ? [] : Array.isArray(v) ? v : [v]).filter(Boolean).slice(0, 20);
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? undefined;

function money(v: string | undefined) {
  if (!v) return undefined;
  try {
    return toMinorUnits(v);
  } catch {
    return undefined;
  }
}

export function parseFilters(sp: SearchParams, collection?: string): CatalogFilters {
  const sort = one(sp.sort);
  const page = Number(one(sp.page));
  return {
    q: one(sp.q)?.slice(0, 100),
    collection,
    colour: arr(sp.colour),
    material: arr(sp.material),
    construction: arr(sp.construction),
    size: arr(sp.size).filter((s) => SIZE_BUCKETS.some((b) => b.id === s)),
    minPrice: money(one(sp.min)),
    maxPrice: money(one(sp.max)),
    inStock: one(sp.available) === "1",
    sort: sort && sort in SORTS ? (sort as SortKey) : "featured",
    page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
  };
}

export async function CatalogListing({ basePath, searchParams, collection }: { basePath: string; searchParams: SearchParams; collection?: string }) {
  const currency = await getCurrency();
  const filters = parseFilters(searchParams, collection);
  const [result, facets] = await Promise.all([searchProducts(filters, currency), getFilterFacets()]);

  const pageHref = (page: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) for (const item of arr(v)) if (k !== "page") params.append(k, item);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  return (
    <div className="grid gap-12 lg:grid-cols-[16rem_1fr]">
      <FilterForm
        basePath={basePath}
        facets={facets}
        currencySymbol={CURRENCY_META[currency].symbol}
        values={{
          q: filters.q ?? "",
          colour: filters.colour ?? [],
          material: filters.material ?? [],
          construction: filters.construction ?? [],
          size: filters.size ?? [],
          min: one(searchParams.min) ?? "",
          max: one(searchParams.max) ?? "",
          available: !!filters.inStock,
          sort: filters.sort ?? "featured",
        }}
        showSearch={basePath === "/search"}
      />
      <div>
        <p className="mb-8 text-sm text-muted" aria-live="polite" data-testid="result-count">
          {result.total} {result.total === 1 ? "carpet" : "carpets"}
        </p>
        {result.items.length === 0 ? (
          <div className="border border-ink/10 px-8 py-16 text-center">
            <p className="font-serif text-2xl">No carpets match these choices.</p>
            <p className="mt-3 text-muted">
              Try removing a filter, or{" "}
              <Link href="/bespoke" className="underline underline-offset-4">
                ask about a bespoke piece
              </Link>
              .
            </p>
          </div>
        ) : (
          <ProductGrid products={result.items} />
        )}
        {result.pageCount > 1 && (
          <nav aria-label="Pagination" className="mt-16 flex items-center justify-center gap-2">
            {Array.from({ length: result.pageCount }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={pageHref(p)}
                aria-current={p === result.page ? "page" : undefined}
                className={`flex h-10 w-10 items-center justify-center border text-sm ${p === result.page ? "border-obsidian bg-obsidian text-ivory" : "border-ink/20 hover:border-obsidian"}`}
              >
                {p}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}
