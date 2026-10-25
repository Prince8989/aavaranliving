"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import { SORTS } from "@/lib/catalog-sorts";
import { SIZE_BUCKETS } from "@/lib/units";

type Values = {
  q: string;
  colour: string[];
  material: string[];
  construction: string[];
  size: string[];
  min: string;
  max: string;
  available: boolean;
  sort: string;
};

function CheckGroup({ legend, name, options, selected }: { legend: string; name: string; options: { value: string; label: string }[]; selected: string[] }) {
  if (options.length === 0) return null;
  return (
    <fieldset className="border-t border-ink/10 pt-5">
      <legend className="label mb-3 text-walnut">{legend}</legend>
      <div className="space-y-2.5">
        {options.map((o) => (
          <label key={o.value} className="flex cursor-pointer items-center gap-3 text-sm">
            <input type="checkbox" name={name} value={o.value} defaultChecked={selected.includes(o.value)} className="h-4 w-4 accent-walnut" />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * A plain GET form: works without JavaScript; with JS it applies changes immediately.
 * Filters live in the URL so results are shareable and crawlable.
 */
export function FilterForm({
  basePath,
  facets,
  values,
  currencySymbol,
  showSearch,
}: {
  basePath: string;
  facets: { colours: string[]; materials: string[]; constructions: string[] };
  values: Values;
  currencySymbol: string;
  showSearch: boolean;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const apply = () => {
    const form = formRef.current;
    if (!form) return;
    const params = new URLSearchParams();
    for (const [k, v] of new FormData(form)) if (typeof v === "string" && v !== "") params.append(k, v);
    if (params.get("sort") === "featured") params.delete("sort");
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
  };

  const opts = (list: string[]) => list.map((v) => ({ value: v, label: v }));

  return (
    <form
      ref={formRef}
      action={basePath}
      method="get"
      role="search"
      aria-label="Filter carpets"
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
      onChange={(e) => {
        const t = e.target as unknown as HTMLInputElement;
        if (t.type === "checkbox" || t.tagName === "SELECT") apply();
      }}
      className="space-y-6"
    >
      {showSearch && (
        <div>
          <label htmlFor="q" className="label mb-2 block text-walnut">
            Search
          </label>
          <input id="q" name="q" type="search" defaultValue={values.q} className="field" placeholder="Colour, material, name…" />
        </div>
      )}
      <div>
        <label htmlFor="sort" className="label mb-2 block text-walnut">
          Sort by
        </label>
        <select id="sort" name="sort" defaultValue={values.sort} className="field">
          {Object.entries(SORTS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <CheckGroup legend="Size" name="size" options={SIZE_BUCKETS.map((b) => ({ value: b.id, label: b.label }))} selected={values.size} />
      <CheckGroup legend="Colour" name="colour" options={opts(facets.colours)} selected={values.colour} />
      <CheckGroup legend="Material" name="material" options={opts(facets.materials)} selected={values.material} />
      <CheckGroup legend="Construction" name="construction" options={opts(facets.constructions)} selected={values.construction} />
      <fieldset className="border-t border-ink/10 pt-5">
        <legend className="label mb-3 text-walnut">Price ({currencySymbol})</legend>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="min">
            Minimum price
          </label>
          <input id="min" name="min" inputMode="decimal" pattern="\d+(\.\d{1,2})?" defaultValue={values.min} placeholder="Min" className="field py-2" />
          <span aria-hidden="true">–</span>
          <label className="sr-only" htmlFor="max">
            Maximum price
          </label>
          <input id="max" name="max" inputMode="decimal" pattern="\d+(\.\d{1,2})?" defaultValue={values.max} placeholder="Max" className="field py-2" />
        </div>
      </fieldset>
      <fieldset className="border-t border-ink/10 pt-5">
        <legend className="sr-only">Availability</legend>
        <label className="flex cursor-pointer items-center gap-3 text-sm">
          <input type="checkbox" name="available" value="1" defaultChecked={values.available} className="h-4 w-4 accent-walnut" />
          Available now only
        </label>
      </fieldset>
      <div className="flex gap-3 border-t border-ink/10 pt-5">
        <button type="submit" className="label bg-obsidian px-5 py-3 text-ivory">
          Apply
        </button>
        <a href={basePath} className="label px-2 py-3 text-muted hover:text-ink">
          Clear
        </a>
      </div>
    </form>
  );
}
