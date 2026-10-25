"use client";

import { useActionState, useEffect } from "react";
import { submitBespoke, type FormState } from "@/app/actions/forms";
import { SelectField, TextArea, TextField } from "@/components/ui/Field";
import { AntiSpamFields } from "@/components/ui/AntiSpamFields";
import { Button } from "@/components/ui/Button";
import { track } from "@/lib/analytics";

export function BespokeForm({ productName }: { productName?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitBespoke, { ok: false });
  const e = state.errors ?? {};

  useEffect(() => {
    if (state.ok) track("generate_lead");
  }, [state.ok]);

  if (state.ok) {
    return (
      <div role="status" className="border border-ink/10 bg-white/50 p-10 text-center">
        <p className="font-serif text-3xl">Thank you.</p>
        <p className="mt-4 text-muted">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="relative space-y-6" noValidate encType="multipart/form-data">
      {state.message && (
        <p role="alert" className="bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.message}
        </p>
      )}
      <div className="grid gap-6 sm:grid-cols-2">
        <TextField label="Name" name="name" autoComplete="name" required error={e.name} />
        <TextField label="Email" name="email" type="email" autoComplete="email" required error={e.email} />
        <TextField label="Country" name="country" autoComplete="country-name" required error={e.country} />
        <TextField label="Carpet dimensions" name="dimensions" required placeholder="e.g. 9 × 12 ft or 275 × 365 cm" error={e.dimensions} />
        <TextField label="Preferred colours" name="colours" error={e.colours} />
        <TextField label="Material preferences" name="materials" placeholder="e.g. wool, wool & silk" error={e.materials} />
        <SelectField
          label="Budget range (USD)"
          name="budget"
          error={e.budget}
          options={[
            { value: "", label: "Select (optional)" },
            { value: "under-2500", label: "Under $2,500" },
            { value: "2500-5000", label: "$2,500 – $5,000" },
            { value: "5000-10000", label: "$5,000 – $10,000" },
            { value: "10000-plus", label: "$10,000 +" },
            { value: "discuss", label: "Prefer to discuss" },
          ]}
        />
        <TextField label="Required delivery date" name="deliveryDate" type="date" error={e.deliveryDate} />
      </div>
      <TextArea label="Design inspiration" name="inspiration" defaultValue={productName ? `Inspired by: ${productName}\n` : ""} error={e.inspiration} />
      <TextArea label="Additional requirements" name="requirements" error={e.requirements} />
      <div className="space-y-2">
        <label htmlFor="referenceImage" className="label block text-muted">
          Reference image (optional)
        </label>
        <input id="referenceImage" name="referenceImage" type="file" accept="image/jpeg,image/png,image/webp,image/avif" aria-describedby="ref-hint" className="block text-sm" />
        <p id="ref-hint" className="text-xs text-muted">
          JPEG, PNG, WebP or AVIF, up to 8 MB.
        </p>
        {e.referenceImage && (
          <p role="alert" className="text-sm text-red-800">
            {e.referenceImage}
          </p>
        )}
      </div>
      <AntiSpamFields />
      <p className="text-xs text-muted">We use these details only to respond to your enquiry. See our Privacy Policy.</p>
      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send bespoke enquiry"}
      </Button>
    </form>
  );
}
