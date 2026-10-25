"use server";

import { cookies } from "next/headers";
import { addToCart, CART_COOKIE, CartError, loadCart, removeCartItem, updateCartItem, type CartView } from "@/lib/cart";
import { currentUser } from "@/lib/authz";
import { CURRENCY_COOKIE, SHIP_COUNTRY_COOKIE } from "@/lib/markets";
import { getCurrency, getShipCountry } from "@/lib/preferences";
import { cartAddSchema, cartUpdateSchema, currencySchema, shipCountrySchema } from "@/lib/validation";

type Result = { ok: true; cart: CartView } | { ok: false; error: string; cart?: CartView };

const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24 * 60,
};

async function cartId() {
  return (await cookies()).get(CART_COOKIE)?.value ?? null;
}

async function view() {
  return loadCart(await cartId(), await getCurrency(), await getShipCountry());
}

export async function getCartAction(): Promise<CartView> {
  return view();
}

export async function addToCartAction(input: { variantId: string; quantity: number }): Promise<Result> {
  const parsed = cartAddSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request." };
  try {
    const user = await currentUser();
    const id = await addToCart(await cartId(), parsed.data.variantId, parsed.data.quantity, user?.id);
    (await cookies()).set(CART_COOKIE, id, cookieOpts);
    return { ok: true, cart: await loadCart(id, await getCurrency(), await getShipCountry()) };
  } catch (e) {
    if (e instanceof CartError) return { ok: false, error: e.message, cart: await view() };
    throw e;
  }
}

export async function updateCartItemAction(input: { itemId: string; quantity: number }): Promise<Result> {
  const parsed = cartUpdateSchema.safeParse(input);
  const id = await cartId();
  if (!parsed.success || !id) return { ok: false, error: "Invalid request." };
  try {
    await updateCartItem(id, parsed.data.itemId, parsed.data.quantity);
    return { ok: true, cart: await view() };
  } catch (e) {
    if (e instanceof CartError) return { ok: false, error: e.message, cart: await view() };
    throw e;
  }
}

export async function removeCartItemAction(itemId: string): Promise<Result> {
  const id = await cartId();
  if (!id || typeof itemId !== "string") return { ok: false, error: "Invalid request." };
  await removeCartItem(id, itemId);
  return { ok: true, cart: await view() };
}

export async function setCurrencyAction(currency: string): Promise<Result> {
  const parsed = currencySchema.safeParse(currency);
  if (!parsed.success) return { ok: false, error: "Unsupported currency." };
  (await cookies()).set(CURRENCY_COOKIE, parsed.data, { ...cookieOpts, httpOnly: false, maxAge: 60 * 60 * 24 * 365 });
  return { ok: true, cart: await loadCart(await cartId(), parsed.data, await getShipCountry()) };
}

export async function setShipCountryAction(country: string): Promise<Result> {
  const parsed = shipCountrySchema.safeParse({ country });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  (await cookies()).set(SHIP_COUNTRY_COOKIE, parsed.data.country, { ...cookieOpts, maxAge: 60 * 60 * 24 * 365 });
  return { ok: true, cart: await loadCart(await cartId(), await getCurrency(), parsed.data.country) };
}
