"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn, signOut } from "@/lib/auth";
import { requireUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/security";
import { addressSchema, fieldErrors, loginSchema } from "@/lib/validation";
import type { FormState } from "./forms";

/** Only same-site relative paths are allowed as post-login destinations (no open redirects). */
function safeCallback(url: string | undefined) {
  return url && url.startsWith("/") && !url.startsWith("//") && !url.includes("\\") ? url : "/account";
}

export async function requestLoginLink(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const ip = clientIp(await headers());
  if (!(await rateLimit(`login-ip:${ip}`, 10, 60 * 60))) {
    return { ok: false, message: "Too many sign-in attempts. Please try again later." };
  }
  try {
    await signIn("resend", { email: parsed.data.email, redirectTo: safeCallback(parsed.data.callbackUrl) });
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, message: "We couldn't send a sign-in link right now. Please try again later." };
    throw e; // NEXT_REDIRECT to the "check your email" page
  }
  return { ok: true };
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

export async function updateProfile(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = z.object({ name: z.string().trim().min(1, "Enter your name").max(120) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  await db.user.update({ where: { id: user.id }, data: { name: parsed.data.name } });
  revalidatePath("/account");
  return { ok: true, message: "Saved." };
}

export async function saveAddress(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = addressSchema.extend({ label: z.string().trim().max(40).optional() }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const count = await db.address.count({ where: { userId: user.id } });
  if (count >= 10) return { ok: false, message: "You can save up to 10 addresses." };
  const d = parsed.data;
  await db.address.create({
    data: {
      userId: user.id,
      label: d.label || null,
      name: d.name,
      line1: d.line1,
      line2: d.line2 || null,
      city: d.city,
      state: d.state || null,
      postalCode: d.postalCode,
      country: d.country,
      phone: d.phone || null,
      isDefault: count === 0,
    },
  });
  revalidatePath("/account");
  return { ok: true, message: "Address saved." };
}

export async function deleteAddress(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  // Scoped by userId: a user can never delete someone else's address.
  await db.address.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/account");
}
