import { db } from "@/lib/db";
import type { Currency } from "@/lib/generated/prisma/enums";
import { loadCart } from "@/lib/cart";
import { CheckoutError, createPendingOrder, markOrderUnpaid } from "@/lib/orders";
import { isProviderConfigured, providerForCurrency } from "@/lib/payments/config";
import { createStripeCheckout } from "@/lib/payments/stripe";
import { createRazorpayOrder } from "@/lib/payments/razorpay";
import { audit } from "@/lib/audit";

export type CheckoutResult =
  | { provider: "STRIPE"; url: string; orderNumber: string }
  | {
      provider: "RAZORPAY";
      orderNumber: string;
      keyId: string;
      razorpayOrderId: string;
      amount: number;
      currency: string;
      prefill: { email: string; name?: string; contact?: string };
    };

export async function startCheckout(params: {
  cartId: string | null;
  currency: Currency;
  shipCountry: string | null;
  userId?: string | null;
  email?: string | null; // required for Razorpay (Stripe collects it)
  address?: { name: string; line1: string; line2?: string; city: string; state?: string; postalCode: string; country: string; phone?: string } | null;
}): Promise<CheckoutResult> {
  if (process.env.NODE_ENV === "production" && process.env.STORE_CHECKOUT_ENABLED !== "true") {
    // Launch gate: stays closed until policies, shipping rates and payment accounts are confirmed.
    throw new CheckoutError("Online ordering opens soon. Please contact us to purchase in the meantime.");
  }
  if (!params.cartId) throw new CheckoutError("Your bag is empty.");
  const cart = await loadCart(params.cartId, params.currency, params.shipCountry);
  if (!cart.checkoutReady) throw new CheckoutError(cart.problems[0] ?? "Your bag can't be checked out yet.");

  const provider = providerForCurrency(params.currency);
  if (!isProviderConfigured(provider)) {
    throw new CheckoutError("Online payment isn't available in this currency yet. Please contact us to place your order.");
  }

  if (provider === "RAZORPAY") {
    if (!params.email || !params.address) throw new CheckoutError("Please provide your email and delivery address.");
    if (params.address.country !== params.shipCountry) throw new CheckoutError("Delivery address country must match the selected destination.");
  }

  const order = await createPendingOrder({
    cartId: params.cartId,
    currency: params.currency,
    shipCountry: params.shipCountry!,
    provider,
    email: params.email ?? "pending@checkout.invalid", // replaced with the Stripe-collected email on payment
    userId: params.userId,
    customerName: params.address?.name,
    phone: params.address?.phone,
    shippingAddress: params.address ?? null,
  });

  try {
    if (provider === "STRIPE") {
      const url = await createStripeCheckout(order, params.shipCountry!);
      return { provider, url, orderNumber: order.number };
    }
    const rzp = await createRazorpayOrder(order);
    return {
      provider,
      orderNumber: order.number,
      keyId: process.env.RAZORPAY_KEY_ID!,
      razorpayOrderId: rzp.id,
      amount: Number(rzp.amount),
      currency: rzp.currency,
      prefill: { email: order.email, name: order.customerName ?? undefined, contact: order.phone ?? undefined },
    };
  } catch (e) {
    // Provider call failed: cancel the pending order so its stock hold is released immediately.
    await db.$transaction((tx) => markOrderUnpaid(tx, order.id, "CANCELLED"));
    await audit({ action: "checkout.provider_error", entity: "Order", entityId: order.id, data: { message: String(e).slice(0, 300) } });
    throw e instanceof CheckoutError ? e : new CheckoutError("We couldn't start secure payment. Please try again.");
  }
}
