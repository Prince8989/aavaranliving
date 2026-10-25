import { db, type Prisma } from "@/lib/db";
import type { EnquiryType } from "@/lib/generated/prisma/enums";
import { adminEnquiryEmail, enquiryAcknowledgementEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";

const LABELS: Record<EnquiryType, string> = {
  GENERAL: "general",
  ORDER: "order",
  PRODUCT: "product",
  DESIGN_COLLABORATION: "design collaboration",
  TRADE: "trade",
  BESPOKE: "bespoke",
};

export async function createEnquiry(input: {
  type: EnquiryType;
  name: string;
  email: string;
  message: string;
  country?: string | null;
  phone?: string | null;
  company?: string | null;
  subject?: string | null;
  details?: Record<string, unknown>;
  referenceImageUrl?: string | null;
  productId?: string | null;
}) {
  const enquiry = await db.enquiry.create({
    data: {
      type: input.type,
      name: input.name,
      email: input.email,
      message: input.message,
      country: input.country || null,
      phone: input.phone || null,
      company: input.company || null,
      subject: input.subject || null,
      details: input.details ? (input.details as Prisma.InputJsonValue) : undefined,
      referenceImageUrl: input.referenceImageUrl || null,
      productId: input.productId || null,
    },
  });

  await sendEmail(enquiryAcknowledgementEmail(enquiry.email, enquiry.name, LABELS[enquiry.type]));
  const admin = process.env.ADMIN_EMAIL;
  if (admin) await sendEmail(adminEnquiryEmail(admin, enquiry));
  return enquiry;
}
