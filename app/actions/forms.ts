"use server";

import { headers } from "next/headers";
import { db } from "@/lib/db";
import { createEnquiry } from "@/lib/enquiries";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/security";
import { storeImage, UploadError } from "@/lib/storage";
import { bespokeSchema, enquirySchema, fieldErrors, isSpam, newsletterSchema } from "@/lib/validation";

export type FormState = { ok: boolean; message?: string; errors?: Record<string, string> };

const CONSENT_TEXT = "I'd like to receive letters from AAVARAN about new collections, journal stories and events. I can unsubscribe at any time.";

async function limited(scope: string, limit: number) {
  const ip = clientIp(await headers());
  return !(await rateLimit(`${scope}:${ip}`, limit, 60 * 60));
}

export async function subscribeNewsletter(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = newsletterSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  if (parsed.data.website) return { ok: true, message: "Thank you." };
  if (await limited("newsletter", 10)) return { ok: false, message: "Too many requests. Please try again later." };

  await db.newsletterSubscriber.upsert({
    where: { email: parsed.data.email },
    create: { email: parsed.data.email, consentText: CONSENT_TEXT, source: "footer" },
    update: { consentText: CONSENT_TEXT, consentAt: new Date(), unsubscribedAt: null },
  });
  return { ok: true, message: "Thank you — you're on our list." };
}

export async function submitEnquiry(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = enquirySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error), message: "Please check the highlighted fields." };
  if (isSpam(parsed.data)) return { ok: true, message: "Thank you. We'll be in touch." };
  if (await limited("enquiry", 5)) return { ok: false, message: "Too many submissions. Please try again later." };

  const d = parsed.data;
  await createEnquiry({
    type: d.type,
    name: d.name,
    email: d.email,
    country: d.country,
    phone: d.phone,
    company: d.company,
    subject: d.subject,
    message: d.message,
    details: d.orderNumber ? { orderNumber: d.orderNumber } : undefined,
  });
  return { ok: true, message: "Thank you. We've received your message and will reply personally." };
}

export async function submitBespoke(_: FormState, formData: FormData): Promise<FormState> {
  const raw = Object.fromEntries(formData);
  const file = formData.get("referenceImage");
  delete raw.referenceImage;
  const parsed = bespokeSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error), message: "Please check the highlighted fields." };
  if (isSpam(parsed.data)) return { ok: true, message: "Thank you. We'll be in touch." };
  if (await limited("bespoke", 5)) return { ok: false, message: "Too many submissions. Please try again later." };

  let referenceImageUrl: string | null = null;
  if (file instanceof File && file.size > 0) {
    try {
      referenceImageUrl = await storeImage(file, "enquiries");
    } catch (e) {
      if (e instanceof UploadError) return { ok: false, errors: { referenceImage: e.message } };
      throw e;
    }
  }

  const d = parsed.data;
  await createEnquiry({
    type: "BESPOKE",
    name: d.name,
    email: d.email,
    country: d.country,
    message: d.requirements || d.inspiration || `Bespoke enquiry: ${d.dimensions}`,
    details: {
      dimensions: d.dimensions,
      colours: d.colours,
      materials: d.materials,
      inspiration: d.inspiration,
      budget: d.budget,
      deliveryDate: d.deliveryDate,
      requirements: d.requirements,
    },
    referenceImageUrl,
  });
  return { ok: true, message: "Thank you. Your bespoke enquiry has been received — we'll reply personally to discuss it." };
}
