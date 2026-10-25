import { z } from "zod";
import { db } from "@/lib/db";
import { confirmRazorpayPayment, verifyPaymentSignature } from "@/lib/payments/razorpay";
import { afterOrderPaid } from "@/lib/payments/after-payment";
import { isSameOrigin, jsonError } from "@/lib/security";

export const runtime = "nodejs";

const schema = z.object({
  razorpay_order_id: z.string().min(1).max(100),
  razorpay_payment_id: z.string().min(1).max(100),
  razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/),
});

/** Called by the browser after Razorpay Checkout succeeds. The signature proves the payment is genuine. */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return jsonError("Forbidden", 403);
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request");
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

  if (!verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    return jsonError("Payment could not be verified", 400);
  }

  const payment = await db.payment.findUnique({ where: { providerRef: razorpay_order_id } });
  if (!payment) return jsonError("Unknown order", 404);

  // Amount comes from our own payment record (a valid signature binds this payment to that Razorpay order).
  const result = await confirmRazorpayPayment({
    razorpayOrderId: razorpay_order_id,
    paymentId: razorpay_payment_id,
    amount: payment.amount,
    currency: payment.currency,
    eventId: `checkout:${razorpay_payment_id}`,
    eventType: "checkout.verified",
  });
  if ("paidOrderId" in result && result.paidOrderId) await afterOrderPaid(result.paidOrderId);
  return Response.json({ ok: true });
}
