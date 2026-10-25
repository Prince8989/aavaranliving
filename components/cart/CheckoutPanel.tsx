"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useCart } from "./CartProvider";
import { CartTotals, ShipToSelector } from "./CartSummary";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { beginCheckoutAction } from "@/app/actions/checkout";
import { track } from "@/lib/analytics";
import { COUNTRY_NAMES } from "@/lib/markets";

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (r: unknown) => void) => void };
  }
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export function CheckoutPanel({ userEmail }: { userEmail?: string | null }) {
  const { cart } = useCart();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const needsAddress = cart.currency === "INR";

  const submit = (form?: HTMLFormElement) =>
    start(async () => {
      setError(null);
      track("begin_checkout", { currency: cart.currency, value: cart.totals.total ? cart.totals.total / 100 : undefined });
      let payload: Parameters<typeof beginCheckoutAction>[0];
      if (form) {
        const fd = new FormData(form);
        const g = (k: string) => String(fd.get(k) ?? "");
        payload = {
          email: g("email"),
          address: { name: g("name"), line1: g("line1"), line2: g("line2"), city: g("city"), state: g("state"), postalCode: g("postalCode"), country: cart.shipCountry ?? "", phone: g("phone") },
        };
      }
      const res = await beginCheckoutAction(payload);
      if (!res.ok) {
        setError(res.error);
        setFields(res.fields ?? {});
        return;
      }
      const r = res.result;
      if (r.provider === "STRIPE") {
        window.location.assign(r.url);
        return;
      }
      if (!(await loadRazorpay()) || !window.Razorpay) {
        setError("The payment window couldn't load. Please check your connection and try again.");
        return;
      }
      const rzp = new window.Razorpay({
        key: r.keyId,
        order_id: r.razorpayOrderId,
        amount: r.amount,
        currency: r.currency,
        name: "AAVARAN",
        description: `Order ${r.orderNumber}`,
        prefill: r.prefill,
        theme: { color: "#241C18" },
        handler: async (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          const v = await fetch("/api/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(resp),
          });
          router.push(v.ok ? `/checkout/success?order=${r.orderNumber}` : `/checkout/cancelled?order=${r.orderNumber}`);
        },
        modal: { ondismiss: () => setError("Payment was not completed. Your bag is saved.") },
      });
      rzp.open();
    });

  return (
    <aside className="space-y-6 bg-sandstone/50 p-6 sm:p-8 lg:sticky lg:top-28 lg:self-start" aria-labelledby="summary-title">
      <h2 id="summary-title" className="font-serif text-2xl">
        Order summary
      </h2>
      <ShipToSelector />
      <CartTotals />

      {cart.problems.length > 0 && (
        <ul className="space-y-1 text-sm text-red-800" role="alert">
          {cart.problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}

      {needsAddress ? (
        <form
          noValidate
          className="space-y-4 border-t border-ink/10 pt-6"
          onSubmit={(e) => {
            e.preventDefault();
            submit(e.currentTarget);
          }}
        >
          <p className="label text-walnut">Delivery details — {COUNTRY_NAMES[cart.shipCountry ?? ""] ?? "Select a country above"}</p>
          <TextField label="Email" name="email" type="email" autoComplete="email" required defaultValue={userEmail ?? ""} error={fields.email} />
          <TextField label="Full name" name="name" autoComplete="name" required error={fields["address.name"]} />
          <TextField label="Address" name="line1" autoComplete="address-line1" required error={fields["address.line1"]} />
          <TextField label="Address line 2" name="line2" autoComplete="address-line2" error={fields["address.line2"]} />
          <div className="grid grid-cols-2 gap-4">
            <TextField label="City" name="city" autoComplete="address-level2" required error={fields["address.city"]} />
            <TextField label="State" name="state" autoComplete="address-level1" error={fields["address.state"]} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <TextField label="PIN code" name="postalCode" autoComplete="postal-code" required error={fields["address.postalCode"]} />
            <TextField label="Phone" name="phone" type="tel" autoComplete="tel" required error={fields["address.phone"]} />
          </div>
          <Button type="submit" className="w-full" disabled={!cart.checkoutReady || pending}>
            {pending ? "Preparing secure payment…" : "Continue to payment"}
          </Button>
        </form>
      ) : (
        <Button className="w-full" disabled={!cart.checkoutReady || pending} onClick={() => submit()} data-testid="checkout-button">
          {pending ? "Preparing secure checkout…" : "Proceed to secure checkout"}
        </Button>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-800" data-testid="checkout-error">
          {error}
        </p>
      )}
      <p className="text-xs leading-relaxed text-muted">
        Payment is processed securely by {needsAddress ? "Razorpay" : "Stripe"}. AAVARAN never sees or stores your card details.
      </p>
    </aside>
  );
}
