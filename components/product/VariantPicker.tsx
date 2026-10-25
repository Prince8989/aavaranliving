"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { Button } from "@/components/ui/Button";
import { formatMoney } from "@/lib/money";
import { track } from "@/lib/analytics";
import type { Currency } from "@/lib/generated/prisma/enums";

export type PickerVariant = {
  id: string;
  label: string;
  dimensions: string;
  weight: string | null;
  price: number | null;
  available: number;
};

export function VariantPicker({ productId, productName, variants, currency }: { productId: string; productName: string; variants: PickerVariant[]; currency: Currency }) {
  const firstAvailable = variants.find((v) => v.available > 0 && v.price != null) ?? variants[0];
  const [selectedId, setSelectedId] = useState(firstAvailable?.id);
  const { add, pending, error } = useCart();
  const router = useRouter();
  const selected = variants.find((v) => v.id === selectedId);

  useEffect(() => {
    track("view_item", { item_id: productId, item_name: productName, currency });
  }, [productId, productName, currency]);

  if (!selected) return <p className="text-muted">This design is currently available by enquiry only.</p>;

  const purchasable = selected.price != null && selected.available > 0;

  return (
    <div className="space-y-8">
      <p className="text-2xl" data-testid="product-price" aria-live="polite">
        {selected.price != null ? formatMoney(selected.price, currency) : "Price on request"}
        <span className="ml-2 text-sm text-muted">{currency}</span>
      </p>

      <fieldset>
        <legend className="label mb-3 text-walnut">Size</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {variants.map((v) => (
            <label
              key={v.id}
              className={`relative cursor-pointer border px-3 py-3 text-center text-sm transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-walnut ${
                v.id === selectedId ? "border-obsidian bg-obsidian text-ivory" : "border-ink/25 hover:border-obsidian"
              } ${v.available === 0 ? "text-muted line-through decoration-1" : ""}`}
            >
              <input type="radio" name="variant" value={v.id} checked={v.id === selectedId} onChange={() => setSelectedId(v.id)} className="sr-only" />
              {v.label}
              {v.available === 0 && <span className="sr-only"> (unavailable)</span>}
            </label>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted">{selected.dimensions}</p>
      </fieldset>

      <p className="text-sm" data-testid="availability">
        {selected.available > 0 ? (
          <span>{selected.available <= 2 ? `Available — ${selected.available} in stock` : "Available"}</span>
        ) : (
          <span className="text-muted">This size is currently unavailable — enquire for production timelines.</span>
        )}
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button className="flex-1" disabled={!purchasable || pending} onClick={() => add(selected.id, 1)} data-testid="add-to-bag">
          {pending ? "Adding…" : "Add to Bag"}
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          disabled={!purchasable || pending}
          onClick={async () => {
            const ok = await add(selected.id, 1, { openDrawer: false });
            if (ok) router.push("/cart");
          }}
        >
          Buy Now
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}
