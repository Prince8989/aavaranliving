"use server";

import { cookies, headers } from "next/headers";
import { CART_COOKIE } from "@/lib/cart";
import { currentUser } from "@/lib/authz";
import { startCheckout, type CheckoutResult } from "@/lib/checkout";
import { CheckoutError } from "@/lib/orders";
import { getCurrency, getShipCountry } from "@/lib/preferences";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/security";
import { fieldErrors, razorpayCheckoutSchema } from "@/lib/validation";
import { PaymentsConfigError } from "@/lib/payments/config";

export type CheckoutActionResult =
  | { ok: true; result: CheckoutResult }
  | { ok: false; error: string; fields?: Record<string, string> };

export async function beginCheckoutAction(form?: { email?: string; address?: Record<string, string> }): Promise<CheckoutActionResult> {
  const ip = clientIp(await headers());
  if (!(await rateLimit(`checkout:${ip}`, 20, 10 * 60))) {
    return { ok: false, error: "Too many checkout attempts. Please wait a few minutes." };
  }

  const currency = await getCurrency();
  let email: string | null = null;
  let address = null;
  if (currency === "INR" || form?.address) {
    const parsed = razorpayCheckoutSchema.safeParse(form ?? {});
    if (!parsed.success) return { ok: false, error: "Please check the highlighted fields.", fields: fieldErrors(parsed.error) };
    email = parsed.data.email;
    address = {
      ...parsed.data.address,
      line2: parsed.data.address.line2 || undefined,
      state: parsed.data.address.state || undefined,
    };
  }

  const user = await currentUser();
  try {
    const result = await startCheckout({
      cartId: (await cookies()).get(CART_COOKIE)?.value ?? null,
      currency,
      shipCountry: await getShipCountry(),
      userId: user?.id,
      email: email ?? user?.email ?? null,
      address,
    });
    return { ok: true, result };
  } catch (e) {
    if (e instanceof CheckoutError) return { ok: false, error: e.message };
    if (e instanceof PaymentsConfigError) return { ok: false, error: "Online payment is temporarily unavailable. Please contact us." };
    console.error("checkout failed", e);
    return { ok: false, error: "Something went wrong starting checkout. Please try again." };
  }
}
