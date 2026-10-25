import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { adminClient } from "@/lib/supabase";

// Records paid orders and decrements stock. Stripe calls this after a successful payment.
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(payload, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") return NextResponse.json({ received: true });

  const db = adminClient();

  // Idempotency: Stripe may deliver the same event more than once.
  const { data: existing } = await db.from("orders").select("id").eq("stripe_session_id", session.id).maybeSingle();
  if (existing) return NextResponse.json({ received: true });

  const lineItems = await stripe().checkout.sessions.listLineItems(session.id, {
    limit: 100,
    expand: ["data.price.product"],
  });

  const { data: order, error } = await db
    .from("orders")
    .insert({
      stripe_session_id: session.id,
      email: session.customer_details?.email ?? null,
      customer_name: session.customer_details?.name ?? null,
      currency: session.currency ?? "usd",
      amount_total: session.amount_total ?? 0,
      // Field location differs across Stripe API versions; check both.
      shipping_address:
        (session as any).collected_information?.shipping_details ??
        (session as any).shipping_details ??
        session.customer_details?.address ??
        null,
    })
    .select("id")
    .single();
  if (error || !order) {
    console.error("Failed to save order", error);
    return NextResponse.json({ error: "Failed to save order" }, { status: 500 }); // Stripe will retry
  }

  const items = lineItems.data.map((li) => {
    const product = li.price?.product as Stripe.Product | undefined;
    return {
      order_id: order.id,
      product_id: product?.metadata?.product_id ?? null,
      name: li.description ?? product?.name ?? "Item",
      unit_amount: li.price?.unit_amount ?? 0,
      quantity: li.quantity ?? 1,
    };
  });
  await db.from("order_items").insert(items);

  for (const item of items) {
    if (item.product_id) await db.rpc("decrement_stock", { p_id: item.product_id, qty: item.quantity });
  }

  return NextResponse.json({ received: true });
}
