import { processStripeEvent, verifyStripeEvent } from "@/lib/payments/stripe";
import { afterOrderPaid } from "@/lib/payments/after-payment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// No CSRF/origin check here: authenticity is proven by Stripe's signature over the raw body.
export async function POST(req: Request) {
  const payload = await req.text();
  let event;
  try {
    event = verifyStripeEvent(payload, req.headers.get("stripe-signature"));
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    const result = await processStripeEvent(event);
    if (result.paidOrderId) await afterOrderPaid(result.paidOrderId);
    return Response.json({ received: true, status: result.status });
  } catch (e) {
    console.error("stripe webhook processing failed", event.id, e);
    return Response.json({ error: "Processing failed" }, { status: 500 }); // Stripe retries
  }
}
