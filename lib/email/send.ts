import { db } from "@/lib/db";

export type EmailMessage = { to: string; subject: string; html: string; text: string; template: string };

function emailMode(): "send" | "skip" | "unconfigured" {
  // Automated tests never send real email.
  if (process.env.NODE_ENV === "test" || process.env.VITEST || process.env.EMAIL_DISABLED === "true") return "skip";
  if (!process.env.EMAIL_API_KEY || !process.env.EMAIL_FROM) return "unconfigured";
  return "send";
}

export function emailConfigured() {
  return emailMode() === "send";
}

/** Sends via Resend's HTTP API. Every attempt is recorded in EmailLog (without the body). */
export async function sendEmail(msg: EmailMessage): Promise<{ ok: boolean; skipped?: boolean }> {
  const mode = emailMode();
  if (mode !== "send") {
    await db.emailLog.create({
      data: {
        to: msg.to,
        subject: msg.subject,
        template: msg.template,
        status: mode === "skip" ? "SKIPPED" : "FAILED",
        error: mode === "unconfigured" ? "EMAIL_API_KEY / EMAIL_FROM not configured" : null,
      },
    });
    if (mode === "unconfigured" && process.env.NODE_ENV !== "production") {
      console.info(`[email:dev] ${msg.template} → ${msg.to}: ${msg.subject}\n${msg.text}`);
    }
    return { ok: mode === "skip", skipped: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.EMAIL_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [msg.to], subject: msg.subject, html: msg.html, text: msg.text }),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    await db.emailLog.create({
      data: {
        to: msg.to,
        subject: msg.subject,
        template: msg.template,
        status: res.ok ? "SENT" : "FAILED",
        providerId: body.id ?? null,
        error: res.ok ? null : `HTTP ${res.status}: ${body.message ?? "unknown"}`.slice(0, 500),
      },
    });
    return { ok: res.ok };
  } catch (e) {
    await db.emailLog.create({
      data: { to: msg.to, subject: msg.subject, template: msg.template, status: "FAILED", error: String(e).slice(0, 500) },
    });
    return { ok: false };
  }
}
