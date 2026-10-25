"use client";

import { useActionState, useId } from "react";
import { subscribeNewsletter, type FormState } from "@/app/actions/forms";

export function NewsletterForm({ dark = false }: { dark?: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(subscribeNewsletter, { ok: false });
  const uid = useId();
  const emailId = `nl-email-${uid}`;

  if (state.ok) {
    return (
      <p role="status" className={dark ? "text-ivory" : "text-ink"}>
        {state.message}
      </p>
    );
  }

  return (
    <form action={action} noValidate>
      <h2 className={`label mb-3 ${dark ? "text-gold" : "text-walnut"}`}>Letters from AAVARAN</h2>
      <div className="flex border-b border-current/40">
        <label htmlFor={emailId} className="sr-only">
          Email address
        </label>
        <input
          id={emailId}
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="Your email address"
          aria-invalid={state.errors?.email ? true : undefined}
          aria-describedby={state.errors?.email ? `${emailId}-error` : undefined}
          className={`w-full bg-transparent py-3 text-sm placeholder:opacity-70 focus:outline-none ${dark ? "text-ivory placeholder:text-sandstone" : "text-ink"}`}
        />
        <button type="submit" disabled={pending} className="label shrink-0 px-2">
          {pending ? "…" : "Subscribe"}
        </button>
      </div>
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <input name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <label className="mt-4 flex items-start gap-3 text-xs leading-relaxed opacity-85">
        <input type="checkbox" name="consent" value="yes" required className="mt-0.5 accent-walnut" />
        <span>I&apos;d like to receive letters about new collections and journal stories. I can unsubscribe at any time.</span>
      </label>
      {state.errors?.email && (
        <p id={`${emailId}-error`} role="alert" className="mt-2 text-xs text-red-300">
          {state.errors.email}
        </p>
      )}
      {state.errors?.consent && (
        <p role="alert" className={`mt-2 text-xs ${dark ? "text-red-300" : "text-red-800"}`}>
          {state.errors.consent}
        </p>
      )}
      {state.message && !state.ok && (
        <p role="alert" className="mt-2 text-xs">
          {state.message}
        </p>
      )}
    </form>
  );
}
