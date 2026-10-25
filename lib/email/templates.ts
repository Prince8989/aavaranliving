import type { Currency } from "@/lib/generated/prisma/enums";
import { formatMoney } from "@/lib/money";
import { escapeHtml as e } from "@/lib/security";
import { absoluteUrl, site } from "@/lib/site";
import type { EmailMessage } from "./send";

function layout(title: string, bodyHtml: string) {
  return `<!doctype html><html><body style="margin:0;background:#F6F0E7;font-family:Helvetica,Arial,sans-serif;color:#241C18">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff">
<tr><td style="background:#241C18;padding:28px;text-align:center;color:#E7D7C1;font-family:Georgia,serif;font-size:24px;letter-spacing:6px">AAVARAN</td></tr>
<tr><td style="padding:32px 32px 8px"><h1 style="font-family:Georgia,serif;font-weight:normal;font-size:24px;margin:0 0 16px">${e(title)}</h1>${bodyHtml}</td></tr>
<tr><td style="padding:24px 32px 32px;font-size:12px;color:#6B5B50;border-top:1px solid #E7D7C1">AAVARAN — A House of ${site.parent}<br>${e(site.statement)}</td></tr>
</table></td></tr></table></body></html>`;
}

const p = (s: string) => `<p style="font-size:15px;line-height:1.6;margin:0 0 16px">${s}</p>`;
const button = (href: string, label: string) =>
  `<p style="margin:24px 0"><a href="${e(href)}" style="background:#241C18;color:#F6F0E7;padding:14px 28px;text-decoration:none;font-size:13px;letter-spacing:2px;text-transform:uppercase">${e(label)}</a></p>`;

export function loginEmail(to: string, url: string): EmailMessage {
  return {
    to,
    template: "login",
    subject: "Your AAVARAN sign-in link",
    html: layout("Sign in to AAVARAN", p("Use the button below to sign in. This link expires in 15 minutes and can be used once.") + button(url, "Sign in") + p("If you didn't request this, you can ignore this email.")),
    text: `Sign in to AAVARAN: ${url}\n\nThis link expires in 15 minutes. If you didn't request it, ignore this email.`,
  };
}

type OrderForEmail = {
  number: string;
  email: string;
  customerName: string | null;
  currency: Currency;
  subtotal: number;
  shippingTotal: number;
  taxTotal: number;
  total: number;
  items: { productName: string; variantLabel: string; quantity: number; lineTotal: number }[];
};

function itemsTable(o: OrderForEmail) {
  const rows = o.items
    .map((i) => `<tr><td style="padding:8px 0;font-size:14px">${e(i.productName)}<br><span style="color:#6B5B50">${e(i.variantLabel)} × ${i.quantity}</span></td><td style="padding:8px 0;font-size:14px;text-align:right">${formatMoney(i.lineTotal, o.currency)}</td></tr>`)
    .join("");
  const total = (label: string, amount: number, bold = false) =>
    `<tr><td style="padding:4px 0;font-size:14px;${bold ? "font-weight:bold" : ""}">${label}</td><td style="padding:4px 0;font-size:14px;text-align:right;${bold ? "font-weight:bold" : ""}">${formatMoney(amount, o.currency)}</td></tr>`;
  return `<table role="presentation" width="100%" style="border-top:1px solid #E7D7C1;margin:8px 0 24px">${rows}
${total("Subtotal", o.subtotal)}${total("Shipping", o.shippingTotal)}${o.taxTotal ? total("Tax", o.taxTotal) : ""}${total(`Total (${o.currency})`, o.total, true)}</table>`;
}

export function orderConfirmationEmail(o: OrderForEmail): EmailMessage {
  const name = o.customerName ? `Dear ${e(o.customerName)},` : "Hello,";
  return {
    to: o.email,
    template: "order-confirmation",
    subject: `Order ${o.number} confirmed — AAVARAN`,
    html: layout(
      "Thank you for your order",
      p(name) + p(`Your payment has been received and order <strong>${e(o.number)}</strong> is confirmed. We'll write again when it ships.`) + itemsTable(o) +
        p("Import duties and taxes for international deliveries may be payable by the recipient unless stated otherwise at checkout.")
    ),
    text: `Order ${o.number} confirmed. Total ${formatMoney(o.total, o.currency)}. We'll email you when it ships.`,
  };
}

export function shippingEmail(o: { number: string; email: string; carrier: string; trackingNumber: string; trackingUrl: string | null }): EmailMessage {
  return {
    to: o.email,
    template: "shipping",
    subject: `Order ${o.number} has shipped — AAVARAN`,
    html: layout(
      "Your carpet is on its way",
      p(`Order <strong>${e(o.number)}</strong> has been dispatched with ${e(o.carrier)}.`) +
        p(`Tracking number: <strong>${e(o.trackingNumber)}</strong>`) +
        (o.trackingUrl ? button(o.trackingUrl, "Track shipment") : "")
    ),
    text: `Order ${o.number} shipped with ${o.carrier}. Tracking: ${o.trackingNumber} ${o.trackingUrl ?? ""}`,
  };
}

export function deliveredEmail(o: { number: string; email: string }): EmailMessage {
  return {
    to: o.email,
    template: "delivered",
    subject: `Order ${o.number} delivered — AAVARAN`,
    html: layout(
      "Delivered",
      p(`Order <strong>${e(o.number)}</strong> has been marked as delivered. We hope it brings warmth to your home.`) +
        button(absoluteUrl("/journal"), "Caring for your carpet")
    ),
    text: `Order ${o.number} has been delivered.`,
  };
}

export function enquiryAcknowledgementEmail(to: string, name: string, kind: string): EmailMessage {
  return {
    to,
    template: "enquiry-ack",
    subject: "We've received your enquiry — AAVARAN",
    html: layout("Thank you for writing to us", p(`Dear ${e(name)},`) + p(`We've received your ${e(kind)} enquiry and will reply personally.`)),
    text: `Dear ${name}, we've received your ${kind} enquiry and will reply personally.`,
  };
}

export function adminEnquiryEmail(to: string, enquiry: { id: string; type: string; name: string; email: string; message: string }): EmailMessage {
  return {
    to,
    template: "admin-enquiry",
    subject: `New ${enquiry.type.toLowerCase()} enquiry from ${enquiry.name}`,
    html: layout(
      "New enquiry",
      p(`<strong>${e(enquiry.name)}</strong> &lt;${e(enquiry.email)}&gt;`) +
        p(e(enquiry.message).replace(/\n/g, "<br>")) +
        button(absoluteUrl(`/admin/enquiries/${enquiry.id}`), "Open in admin")
    ),
    text: `New ${enquiry.type} enquiry from ${enquiry.name} <${enquiry.email}>:\n\n${enquiry.message}`,
  };
}
