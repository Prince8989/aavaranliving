"use client";

import { useActionState, useEffect } from "react";
import { submitEnquiry, type FormState } from "@/app/actions/forms";
import { SelectField, TextArea, TextField } from "@/components/ui/Field";
import { AntiSpamFields } from "@/components/ui/AntiSpamFields";
import { Button } from "@/components/ui/Button";
import { track } from "@/lib/analytics";

export function ContactForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(submitEnquiry, { ok: false });
  const e = state.errors ?? {};
  useEffect(() => {
    if (state.ok) track("generate_lead");
  }, [state.ok]);

  if (state.ok) {
    return (
      <div role="status" className="border border-ink/10 bg-white/50 p-10 text-center" data-testid="contact-success">
        <p className="font-serif text-3xl">Thank you.</p>
        <p className="mt-4 text-muted">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="relative space-y-6" noValidate>
      {state.message && (
        <p role="alert" className="bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.message}
        </p>
      )}
      <SelectField
        label="Nature of enquiry"
        name="type"
        required
        error={e.type}
        options={[
          { value: "GENERAL", label: "General enquiry" },
          { value: "ORDER", label: "Order assistance" },
          { value: "PRODUCT", label: "Product question" },
          { value: "DESIGN_COLLABORATION", label: "Interior design collaboration" },
          { value: "TRADE", label: "Wholesale & trade" },
        ]}
      />
      <div className="grid gap-6 sm:grid-cols-2">
        <TextField label="Name" name="name" autoComplete="name" required error={e.name} />
        <TextField label="Email" name="email" type="email" autoComplete="email" required error={e.email} />
        <TextField label="Country" name="country" autoComplete="country-name" error={e.country} />
        <TextField label="Company / studio" name="company" autoComplete="organization" error={e.company} />
        <TextField label="Order number (if applicable)" name="orderNumber" placeholder="AAV-000123" error={e.orderNumber} />
        <TextField label="Phone" name="phone" type="tel" autoComplete="tel" error={e.phone} />
      </div>
      <TextArea label="Message" name="message" required error={e.message} />
      <AntiSpamFields />
      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
