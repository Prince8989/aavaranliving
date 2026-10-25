import { db } from "@/lib/db";
import { fromMinorUnits } from "@/lib/money";
import { PageTitle, inputCls, labelCls } from "@/components/admin/ui";
import { saveShippingRateAction } from "../actions";

const ZONES = [
  { zone: "US", label: "United States", currencies: ["USD"] },
  { zone: "UK", label: "United Kingdom", currencies: ["GBP", "USD"] },
  { zone: "EU", label: "European Union", currencies: ["EUR", "USD"] },
  { zone: "IN", label: "India", currencies: ["INR"] },
] as const;

export default async function AdminShipping() {
  const rates = await db.shippingRate.findMany();
  const find = (zone: string, currency: string) => rates.find((r) => r.zone === zone && r.currency === currency);
  return (
    <>
      <PageTitle title="Shipping rates" />
      <p className="mb-8 max-w-3xl text-sm text-muted">
        One flat rate per destination zone and currency, with an optional free-shipping threshold. Enter your actual carrier costs. A destination with no rate
        cannot check out online (customers are asked to contact you). Leave the amount blank and save to remove a rate.
      </p>
      <div className="space-y-6">
        {ZONES.flatMap((z) =>
          z.currencies.map((currency) => {
            const r = find(z.zone, currency);
            return (
              <form key={`${z.zone}-${currency}`} action={saveShippingRateAction} className="grid items-end gap-4 border border-ink/10 bg-white p-5 md:grid-cols-[12rem_1fr_1fr_2fr_auto_auto]">
                <input type="hidden" name="zone" value={z.zone} />
                <input type="hidden" name="currency" value={currency} />
                <p className="font-medium">{z.label} · {currency}</p>
                <div><label className={labelCls} htmlFor={`${z.zone}${currency}a`}>Amount</label><input id={`${z.zone}${currency}a`} name="amount" inputMode="decimal" defaultValue={r ? fromMinorUnits(r.amount) : ""} className={inputCls} /></div>
                <div><label className={labelCls} htmlFor={`${z.zone}${currency}f`}>Free over</label><input id={`${z.zone}${currency}f`} name="freeOver" inputMode="decimal" defaultValue={r?.freeOverAmount != null ? fromMinorUnits(r.freeOverAmount) : ""} className={inputCls} /></div>
                <div><label className={labelCls} htmlFor={`${z.zone}${currency}l`}>Label</label><input id={`${z.zone}${currency}l`} name="label" defaultValue={r?.label ?? "Insured delivery"} className={inputCls} /></div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={r?.isActive ?? true} /> Active</label>
                <button className="label bg-obsidian px-4 py-2.5 text-ivory">Save</button>
              </form>
            );
          })
        )}
      </div>
    </>
  );
}
