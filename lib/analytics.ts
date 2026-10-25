"use client";

// Thin wrapper: events are forwarded only if the visitor consented and the tags are loaded.
// Never pass personal or payment data here.
type EventName = "view_item" | "add_to_cart" | "begin_checkout" | "purchase" | "generate_lead";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

const META_EVENTS: Record<EventName, string> = {
  view_item: "ViewContent",
  add_to_cart: "AddToCart",
  begin_checkout: "InitiateCheckout",
  purchase: "Purchase",
  generate_lead: "Lead",
};

export function track(event: EventName, params: { currency?: string; value?: number; item_id?: string; item_name?: string } = {}) {
  try {
    window.gtag?.("event", event, params);
    window.fbq?.("track", META_EVENTS[event], {
      currency: params.currency,
      value: params.value,
      content_ids: params.item_id ? [params.item_id] : undefined,
    });
  } catch {
    /* analytics must never break the page */
  }
}
