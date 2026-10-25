"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/authz";
import { db, type Prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { AdminError, deleteOrArchiveProduct, saveProduct, type ProductInput } from "@/lib/admin/products";
import { addShipment, refundOrder, setFulfillment } from "@/lib/admin/orders";
import { storeImage, UploadError } from "@/lib/storage";
import { toMinorUnits } from "@/lib/money";
import { CURRENCIES } from "@/lib/markets";
import { DEFAULT_CONTENT } from "@/lib/content";
import { fieldErrors } from "@/lib/validation";

// Every action re-checks admin authorization; layouts alone are not a security boundary.

type Result = { ok: boolean; message?: string; errors?: Record<string, string>; id?: string; url?: string };

export async function saveProductAction(input: ProductInput): Promise<Result> {
  const admin = await requireAdmin();
  try {
    const product = await saveProduct(input, admin.id);
    revalidatePath("/", "layout");
    return { ok: true, id: product.id, message: "Saved." };
  } catch (e) {
    if (e instanceof z.ZodError) return { ok: false, errors: fieldErrors(e), message: "Please fix the highlighted fields." };
    if (e instanceof AdminError) return { ok: false, message: e.message };
    if ((e as { code?: string }).code === "P2002") return { ok: false, message: "That slug or SKU is already in use." };
    throw e;
  }
}

export async function deleteProductAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id"));
  await deleteOrArchiveProduct(id, admin.id);
  revalidatePath("/", "layout");
  redirect("/admin/products");
}

export async function uploadImageAction(formData: FormData): Promise<Result> {
  await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File)) return { ok: false, message: "No file received." };
  try {
    return { ok: true, url: await storeImage(file, "products") };
  } catch (e) {
    if (e instanceof UploadError) return { ok: false, message: e.message };
    throw e;
  }
}

export async function fulfillmentAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("orderId"));
  const to = z.enum(["PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "UNFULFILLED"]).parse(formData.get("to"));
  try {
    await setFulfillment(id, to, admin.id);
  } catch (e) {
    if (!(e instanceof AdminError)) throw e;
    redirect(`/admin/orders/${id}?error=${encodeURIComponent(e.message)}`);
  }
  revalidatePath(`/admin/orders/${id}`);
}

export async function shipmentAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("orderId"));
  const parsed = z
    .object({ carrier: z.string().trim().min(2).max(60), trackingNumber: z.string().trim().min(3).max(80), trackingUrl: z.string().trim().max(500).optional() })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/admin/orders/${id}?error=${encodeURIComponent("Enter a carrier and tracking number.")}`);
  try {
    await addShipment(id, parsed.data, admin.id);
  } catch (e) {
    if (!(e instanceof AdminError)) throw e;
    redirect(`/admin/orders/${id}?error=${encodeURIComponent(e.message)}`);
  }
  revalidatePath(`/admin/orders/${id}`);
}

export async function refundAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("orderId"));
  if (formData.get("confirm") !== "REFUND") redirect(`/admin/orders/${id}?error=${encodeURIComponent('Type "REFUND" to confirm.')}`);
  let amount: number;
  try {
    amount = toMinorUnits(String(formData.get("amount") ?? ""));
  } catch {
    redirect(`/admin/orders/${id}?error=${encodeURIComponent("Enter a valid refund amount.")}`);
  }
  try {
    await refundOrder(id, amount, admin.id);
  } catch (e) {
    const msg = e instanceof AdminError ? e.message : "The payment provider rejected the refund. See the audit log.";
    if (!(e instanceof AdminError)) await audit({ actorId: admin.id, action: "refund.failed", entity: "Order", entityId: id, data: { error: String(e).slice(0, 300) } });
    redirect(`/admin/orders/${id}?error=${encodeURIComponent(msg)}`);
  }
  redirect(`/admin/orders/${id}?notice=${encodeURIComponent("Refund submitted to the payment provider.")}`);
}

export async function orderNoteAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("orderId"));
  const notes = String(formData.get("notes") ?? "").slice(0, 2000);
  await db.order.update({ where: { id }, data: { notes } });
  await audit({ actorId: admin.id, action: "order.note", entity: "Order", entityId: id });
  revalidatePath(`/admin/orders/${id}`);
}

export async function enquiryStatusAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id"));
  const status = z.enum(["NEW", "IN_PROGRESS", "CLOSED"]).parse(formData.get("status"));
  await db.enquiry.update({ where: { id }, data: { status } });
  await audit({ actorId: admin.id, action: "enquiry.status", entity: "Enquiry", entityId: id, data: { status } });
  revalidatePath("/admin/enquiries");
}

const collectionSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(2).max(120),
  tagline: z.string().trim().max(200).optional(),
  description: z.string().trim().max(3000).optional(),
  seoTitle: z.string().trim().max(70).optional(),
  seoDescription: z.string().trim().max(160).optional(),
  sortOrder: z.coerce.number().int().min(0).max(999),
  isPublished: z.coerce.boolean().optional(),
});

export async function saveCollectionAction(formData: FormData) {
  const admin = await requireAdmin();
  const d = collectionSchema.parse({ ...Object.fromEntries(formData), isPublished: formData.get("isPublished") === "on" });
  await db.collection.update({
    where: { id: d.id },
    data: { name: d.name, tagline: d.tagline || null, description: d.description || null, seoTitle: d.seoTitle || null, seoDescription: d.seoDescription || null, sortOrder: d.sortOrder, isPublished: !!d.isPublished },
  });
  await audit({ actorId: admin.id, action: "collection.update", entity: "Collection", entityId: d.id });
  revalidatePath("/", "layout");
}

const articleSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(3).max(200),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  excerpt: z.string().trim().min(10).max(400),
  body: z.string().trim().min(20).max(50000),
  topic: z.string().trim().max(60).optional(),
  coverImage: z.string().trim().max(1000).optional(),
  coverAlt: z.string().trim().max(200).optional(),
  status: z.enum(["DRAFT", "PUBLISHED"]),
  seoTitle: z.string().trim().max(70).optional(),
  seoDescription: z.string().trim().max(160).optional(),
});

export async function saveArticleAction(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = articleSchema.safeParse(Object.fromEntries(formData));
  const back = formData.get("id") ? `/admin/journal/${formData.get("id")}` : "/admin/journal/new";
  if (!parsed.success) redirect(`${back}?error=${encodeURIComponent(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "))}`);
  const d = parsed.data;
  if (d.coverImage && !/^(https:\/\/|\/uploads\/)/.test(d.coverImage)) redirect(`${back}?error=${encodeURIComponent("Cover image must be an https URL or uploaded file.")}`);
  const existing = d.id ? await db.journalArticle.findUnique({ where: { id: d.id } }) : null;
  const data = {
    title: d.title,
    slug: d.slug,
    excerpt: d.excerpt,
    body: d.body,
    topic: d.topic || null,
    coverImage: d.coverImage || null,
    coverAlt: d.coverAlt || null,
    status: d.status,
    publishedAt: d.status === "PUBLISHED" ? (existing?.publishedAt ?? new Date()) : existing?.publishedAt ?? null,
    seoTitle: d.seoTitle || null,
    seoDescription: d.seoDescription || null,
  };
  const article = existing ? await db.journalArticle.update({ where: { id: existing.id }, data }) : await db.journalArticle.create({ data });
  await audit({ actorId: admin.id, action: existing ? "article.update" : "article.create", entity: "JournalArticle", entityId: article.id });
  revalidatePath("/", "layout");
  redirect(`/admin/journal/${article.id}?notice=Saved`);
}

export async function deleteArticleAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = String(formData.get("id"));
  await db.journalArticle.delete({ where: { id } });
  await audit({ actorId: admin.id, action: "article.delete", entity: "JournalArticle", entityId: id });
  revalidatePath("/", "layout");
  redirect("/admin/journal");
}

const POLICY_KEYS = ["policy-shipping", "policy-returns", "policy-privacy", "policy-terms"] as const;

export async function saveContentAction(formData: FormData) {
  const admin = await requireAdmin();
  const key = String(formData.get("key"));
  let value: Prisma.InputJsonValue;
  if ((POLICY_KEYS as readonly string[]).includes(key)) {
    value = { body: String(formData.get("body") ?? "").slice(0, 100_000) };
  } else if (key in DEFAULT_CONTENT) {
    const defaults = DEFAULT_CONTENT[key as keyof typeof DEFAULT_CONTENT] as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [field, def] of Object.entries(defaults)) {
      const raw = String(formData.get(field) ?? "").slice(0, 20_000);
      out[field] = Array.isArray(def) ? raw.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean) : raw.trim();
    }
    value = out as Prisma.InputJsonValue;
  } else {
    throw new Error("Unknown content key");
  }
  await db.contentBlock.upsert({ where: { key }, create: { key, value }, update: { value } });
  await audit({ actorId: admin.id, action: "content.update", entity: "ContentBlock", entityId: key });
  revalidatePath("/", "layout");
  redirect(`/admin/content?notice=${encodeURIComponent(`Saved ${key}`)}`);
}

export async function saveShippingRateAction(formData: FormData) {
  const admin = await requireAdmin();
  const zone = z.enum(["US", "UK", "EU", "IN"]).parse(formData.get("zone"));
  const currency = z.enum(CURRENCIES).parse(formData.get("currency"));
  const amountRaw = String(formData.get("amount") ?? "").trim();
  if (!amountRaw) {
    await db.shippingRate.deleteMany({ where: { zone, currency } });
  } else {
    const amount = toMinorUnits(amountRaw);
    const freeRaw = String(formData.get("freeOver") ?? "").trim();
    const freeOverAmount = freeRaw ? toMinorUnits(freeRaw) : null;
    const label = z.string().trim().min(2).max(80).parse(formData.get("label"));
    await db.shippingRate.upsert({
      where: { zone_currency: { zone, currency } },
      create: { zone, currency, amount, freeOverAmount, label, isActive: formData.get("isActive") === "on" },
      update: { amount, freeOverAmount, label, isActive: formData.get("isActive") === "on" },
    });
  }
  await audit({ actorId: admin.id, action: "shipping.update", entity: "ShippingRate", entityId: `${zone}:${currency}` });
  revalidatePath("/admin/shipping");
}
