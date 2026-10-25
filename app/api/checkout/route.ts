import { NextResponse } from "next/server";
import { publicClient } from "@/lib/supabase";
import { stripe, SHIPPING_COUNTRIES } from "@/lib/stripe";
import { parseCurrency, priceFor } from "@/lib/currency";
import type { Product } from "@/lib/types";

type Body = { currency?: string; items?: { id: string; quantity: number }[] };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const currency = parseCurrency(body.currency);
  const requested = (body.items ?? []).filter(
    (i) => typeof i.id === "string" && Number.isInteger(i.quantity) && i.quantity > 0 && i.quantity <= 20
  );
  if (requested.length === 0) {
    return NextResponse.json({ error: "Your cart is empty" }, { status: 400 });
  }

  // Prices always come from the database, never from the browser.
  const { data, error } = await publicClient()
    .from("products")
    .select("*")
    .in("id", requested.map((i) => i.id))
    .eq("is_active", true);
  if (error) return NextResponse.json({ error: "Could not load products" }, { status: 500 });

  const products = new Map((data as Product[]).map((p) => [p.id, p]));
  const lineItems = [];
  for (const item of requested) {
    const p = products.get(item.id);
    if (!p) return NextResponse.json({ error: "An item in your cart is no longer available" }, { status: 400 });
    if (p.stock < item.quantity) {
      return NextResponse.json({ error: `Only ${p.stock} left of ${p.name}` }, { status: 400 });
    }
    lineItems.push({
      quantity: item.quantity,
      price_data: {
        currency,
        unit_amount: priceFor(p, currency),
        product_data: {
          name: p.name,
          images: p.images.slice(0, 1),
          metadata: { product_id: p.id },
        },
      },
    });
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  try {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      shipping_address_collection: { allowed_countries: SHIPPING_COUNTRIES },
      phone_number_collection: { enabled: true },
      success_url: `${site}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/cart`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("Stripe checkout error", e);
    return NextResponse.json({ error: "Payment service unavailable. Please try again." }, { status: 502 });
  }
}
