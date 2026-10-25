import { site } from "@/lib/site";

/**
 * CSRF defence for JSON route handlers: browsers always send Origin on cross-site POSTs,
 * so a mismatching Origin is rejected. (Server Actions get this check from Next.js automatically.)
 */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return req.headers.get("sec-fetch-site") === "same-origin";
  try {
    const o = new URL(origin);
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    if (host && o.host === host) return true;
    return o.host === new URL(site.url).host;
  } catch {
    return false;
  }
}

export function clientIp(headers: Headers): string {
  return (
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export function jsonError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

/** Strip anything that could be interpreted as HTML when echoing user text into emails. */
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
