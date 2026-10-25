"use client";

import { useActionState } from "react";
import { saveAddress, updateProfile } from "@/app/actions/account";
import type { FormState } from "@/app/actions/forms";
import { SelectField, TextField } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { COUNTRY_NAMES, SHIPPABLE_COUNTRIES } from "@/lib/markets";

export function ProfileForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateProfile, { ok: false });
  return (
    <form action={action} className="space-y-4" noValidate>
      <TextField label="Name" name="name" defaultValue={name} autoComplete="name" required error={state.errors?.name} />
      <Button type="submit" variant="outline" disabled={pending}>
        Save
      </Button>
      {state.message && <p role="status" className="text-sm text-muted">{state.message}</p>}
    </form>
  );
}

export function AddressForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(saveAddress, { ok: false });
  const e = state.errors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <TextField label="Label (e.g. Home)" name="label" error={e.label} />
      <TextField label="Full name" name="name" autoComplete="name" required error={e.name} />
      <TextField label="Address" name="line1" autoComplete="address-line1" required error={e.line1} />
      <TextField label="Address line 2" name="line2" autoComplete="address-line2" error={e.line2} />
      <TextField label="City" name="city" autoComplete="address-level2" required error={e.city} />
      <TextField label="State / county" name="state" autoComplete="address-level1" error={e.state} />
      <TextField label="Postal code" name="postalCode" autoComplete="postal-code" required error={e.postalCode} />
      <SelectField label="Country" name="country" required error={e.country} options={SHIPPABLE_COUNTRIES.map((c) => ({ value: c, label: COUNTRY_NAMES[c] }))} />
      <TextField label="Phone" name="phone" type="tel" autoComplete="tel" error={e.phone} />
      <Button type="submit" variant="outline" disabled={pending}>
        Save address
      </Button>
      {state.message && <p role="status" className="text-sm text-muted">{state.message}</p>}
    </form>
  );
}
