"use client";

import { useActionState } from "react";
import { requestLoginLink } from "@/app/actions/account";
import type { FormState } from "@/app/actions/forms";
import { TextField } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(requestLoginLink, { ok: false });
  return (
    <form action={action} className="space-y-6" noValidate>
      <TextField label="Email" name="email" type="email" autoComplete="email" required error={state.errors?.email} />
      <input type="hidden" name="callbackUrl" value={callbackUrl ?? "/account"} />
      {state.message && (
        <p role="alert" className="text-sm text-red-800">
          {state.message}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Email me a sign-in link"}
      </Button>
    </form>
  );
}
