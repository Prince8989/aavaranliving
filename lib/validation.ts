import { z } from "zod";
import { CURRENCIES, SHIPPABLE_COUNTRIES } from "@/lib/markets";
import { MAX_QTY_PER_LINE } from "@/lib/pricing";

const trimmed = (max: number) => z.string().trim().max(max);
const email = z.string().trim().toLowerCase().email("Enter a valid email address").max(254);
const country = z.string().trim().toUpperCase().length(2);

export const currencySchema = z.enum(CURRENCIES);

export const cartAddSchema = z.object({
  variantId: z.string().min(1).max(40),
  quantity: z.coerce.number().int().min(1).max(MAX_QTY_PER_LINE).default(1),
});

export const cartUpdateSchema = z.object({
  itemId: z.string().min(1).max(40),
  quantity: z.coerce.number().int().min(0).max(MAX_QTY_PER_LINE),
});

export const shipCountrySchema = z.object({
  country: country.refine((c) => SHIPPABLE_COUNTRIES.includes(c), "We don't deliver to this country yet"),
});

export const addressSchema = z.object({
  name: trimmed(120).min(2, "Enter the recipient's name"),
  line1: trimmed(200).min(3, "Enter the address"),
  line2: trimmed(200).optional().or(z.literal("")),
  city: trimmed(100).min(2, "Enter the city"),
  state: trimmed(100).optional().or(z.literal("")),
  postalCode: trimmed(20).min(3, "Enter the postal code"),
  country,
  phone: trimmed(30).optional().or(z.literal("")),
});

export const razorpayCheckoutSchema = z.object({
  email,
  address: addressSchema.extend({ phone: trimmed(30).min(8, "Enter a phone number for delivery") }),
});

// Anti-spam: honeypot must stay empty; form must take at least 2 seconds to fill.
const antiSpam = {
  website: z.string().max(0, "Invalid submission").optional().or(z.literal("")),
  startedAt: z.coerce.number().int().optional(),
};

export const enquirySchema = z.object({
  type: z.enum(["GENERAL", "ORDER", "PRODUCT", "DESIGN_COLLABORATION", "TRADE"]),
  name: trimmed(120).min(2, "Enter your name"),
  email,
  country: trimmed(60).optional().or(z.literal("")),
  phone: trimmed(30).optional().or(z.literal("")),
  company: trimmed(120).optional().or(z.literal("")),
  subject: trimmed(160).optional().or(z.literal("")),
  message: trimmed(5000).min(10, "Please tell us a little more (at least 10 characters)"),
  orderNumber: trimmed(30).optional().or(z.literal("")),
  ...antiSpam,
});

export const bespokeSchema = z.object({
  name: trimmed(120).min(2, "Enter your name"),
  email,
  country: trimmed(60).min(2, "Enter your country"),
  dimensions: trimmed(120).min(2, "Enter approximate dimensions"),
  colours: trimmed(300).optional().or(z.literal("")),
  materials: trimmed(300).optional().or(z.literal("")),
  inspiration: trimmed(3000).optional().or(z.literal("")),
  budget: z.enum(["", "under-2500", "2500-5000", "5000-10000", "10000-plus", "discuss"]).optional(),
  deliveryDate: trimmed(40).optional().or(z.literal("")),
  requirements: trimmed(5000).optional().or(z.literal("")),
  referenceImageUrl: z.string().url().max(500).optional().or(z.literal("")),
  ...antiSpam,
});

export const newsletterSchema = z.object({
  email,
  consent: z.literal("yes", { errorMap: () => ({ message: "Please confirm you'd like to receive our letters" }) }),
  website: antiSpam.website,
});

export const loginSchema = z.object({ email, callbackUrl: z.string().max(300).optional() });

export function isSpam(data: { website?: string; startedAt?: number }) {
  if (data.website) return true;
  if (data.startedAt && Date.now() - data.startedAt < 2000) return true;
  return false;
}

export function fieldErrors(error: z.ZodError) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const k = issue.path.join(".");
    if (!out[k]) out[k] = issue.message;
  }
  return out;
}
