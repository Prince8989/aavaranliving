import { confirmRazorpayPayment, verifyWebhookSignature } from "@/lib/payments/razorpay";
import { afterOrderPaid } from "@/lib/payments/after-payment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RazorpayWebhook = {
  event: string;
  payload?: { payment?: { entity?: { id: string; order_id: string; amount: number; currency: string; status: string } } };
};

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("x-razorpay-signature"))) {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }
  const eventId = req.headers.get("x-razorpay-event-id");
  let body: RazorpayWebhook;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }
  if (!eventId) return Response.json({ error: "Missing event id" }, { status: 400 });

  const payment = body.payload?.payment?.entity;
  if (!payment || !["payment.captured", "order.paid"].includes(body.event)) {
    return Response.json({ received: true, status: "ignored" });
  }

  try {
    const result = await confirmRazorpayPayment({
      razorpayOrderId: payment.order_id,
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      eventId,
      eventType: body.event,
    });
    if ("paidOrderId" in result && result.paidOrderId) await afterOrderPaid(result.paidOrderId);
    return Response.json({ received: true, status: result.status });
  } catch (e) {
    console.error("razorpay webhook failed", eventId, e);
    return Response.json({ error: "Processing failed" }, { status: 500 });
  }
}
