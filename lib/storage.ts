import crypto from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

const SIGNATURES: { type: string; ext: string; test: (b: Buffer) => boolean }[] = [
  { type: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { type: "image/png", ext: "png", test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { type: "image/webp", ext: "webp", test: (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP" },
  { type: "image/avif", ext: "avif", test: (b) => b.subarray(4, 12).toString("ascii").startsWith("ftypavi") },
];

export class UploadError extends Error {}

/** Validates by magic bytes (not the client-supplied MIME type). SVG and other active formats are rejected. */
export function detectImageType(buf: Buffer) {
  return SIGNATURES.find((s) => s.test(buf)) ?? null;
}

export async function storeImage(file: File, folder: "products" | "enquiries" | "content"): Promise<string> {
  if (file.size === 0) throw new UploadError("The file is empty.");
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError("Images must be 8 MB or smaller.");
  const buf = Buffer.from(await file.arrayBuffer());
  const kind = detectImageType(buf);
  if (!kind) throw new UploadError("Only JPEG, PNG, WebP or AVIF images are accepted.");

  const name = `${folder}/${crypto.randomUUID()}.${kind.ext}`; // never trust the client filename

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(name, buf, { access: "public", contentType: kind.type, addRandomSuffix: false });
    return blob.url;
  }
  if (process.env.NODE_ENV === "production") throw new UploadError("Image storage is not configured.");

  // Development fallback only.
  const dest = path.join(process.cwd(), "public", "uploads", name);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, buf);
  return `/uploads/${name}`;
}
