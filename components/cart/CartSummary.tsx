"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "./CartProvider";
import { formatMoney } from "@/lib/money";
import { COUNTRY_NAMES, SHIPPABLE_COUNTRIES, TAX_DISCLOSURE } from "@/lib/markets";
import { MAX_QTY_PER_LINE } from "@/lib/pricing";
import { Motif } from "@/components/ui/Motif";

export function CartLines({ compact = false }: { compact?: boolean }) {
  const { cart, update, remove, pending } = useCart();
  return (
    <ul className="divide-y divide-ink/10" aria-busy={pending}>
      {cart.lines.map((line) => (
        <li key={line.itemId} className="flex gap-4 py-5" data-testid="cart-line">
          <Link href={`/products/${line.productSlug}`} className="relative block h-28 w-20 shrink-0 overflow-hidden bg-sandstone">
            {line.image ? (
              <Image src={line.image.url} alt={line.image.alt} fill sizes="80px" className="object-cover" />
            ) : (
              <Motif className="h-full w-full" showLabel={false} label={line.productName} />
            )}
          </Link>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex justify-between gap-3">
              <div className="min-w-0">
                <Link href={`/products/${line.productSlug}`} className="font-serif text-lg leading-tight hover:text-walnut">
                  {line.productName}
                </Link>
                <p className="mt-1 text-sm text-muted">{line.variantLabel}</p>
              </div>
              <p className="shrink-0 text-sm">{line.lineTotal != null ? formatMoney(line.lineTotal, cart.currency) : "—"}</p>
            </div>
            {line.problem && (
              <p className="mt-2 text-sm text-red-800" role="alert">
                {line.problem}
              </p>
            )}
            <div className="mt-auto flex items-center gap-4 pt-3">
              <label className="sr-only" htmlFor={`qty-${line.itemId}`}>
                Quantity for {line.productName}
              </label>
              <select
                id={`qty-${line.itemId}`}
                value={line.quantity}
                disabled={pending}
                onChange={(e) => update(line.itemId, Number(e.target.value))}
                className="border border-ink/25 bg-transparent px-2 py-1.5 text-sm"
                data-testid="cart-qty"
              >
                {Array.from({ length: Math.max(MAX_QTY_PER_LINE, line.quantity) }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n} disabled={n > Math.max(line.available, line.quantity)}>
                    {n}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => remove(line.itemId)}
                disabled={pending}
                className="text-xs uppercase tracking-[0.15em] text-muted underline-offset-4 hover:text-ink hover:underline"
              >
                Remove
              </button>
            </div>
          </div>
        </li>
      ))}
      {compact ? null : null}
    </ul>
  );
}

export function ShipToSelector() {
  const { cart, setShipCountry, pending } = useCart();
  return (
    <div className="flex items-center justify-between gap-4">
      <label htmlFor="ship-to" className="text-sm text-muted">
        Deliver to
      </label>
      <select
        id="ship-to"
        value={cart.shipCountry ?? ""}
        disabled={pending}
        onChange={(e) => setShipCountry(e.target.value)}
        className="max-w-[60%] border border-ink/25 bg-transparent px-2 py-1.5 text-sm"
      >
        <option value="" disabled>
          Select country
        </option>
        {SHIPPABLE_COUNTRIES.map((c) => (
          <option key={c} value={c}>
            {COUNTRY_NAMES[c]}
          </option>
        ))}
      </select>
    </div>
  );
}

export function CartTotals() {
  const { cart } = useCart();
  const t = cart.totals;
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between">
        <dt className="text-muted">Subtotal</dt>
        <dd data-testid="cart-subtotal">{formatMoney(t.subtotal, cart.currency)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-muted">Shipping</dt>
        <dd>{t.shipping == null ? "—" : t.shipping === 0 ? "Complimentary" : formatMoney(t.shipping, cart.currency)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-muted">Taxes</dt>
        <dd className="text-right">{cart.zone === "US" ? "Shown at payment" : cart.zone === "IN" ? "Shown at payment" : "Not prepaid"}</dd>
      </div>
      <div className="flex justify-between border-t border-ink/15 pt-3 text-base">
        <dt>Total</dt>
        <dd className="font-medium">{t.total == null ? "—" : `${formatMoney(t.total, cart.currency)} ${cart.currency}`}</dd>
      </div>
      {cart.zone && <p className="pt-1 text-xs leading-relaxed text-muted">{TAX_DISCLOSURE[cart.zone]}</p>}
      <p className="text-xs text-muted">Payment will be taken in {cart.currency}.</p>
    </dl>
  );
}
