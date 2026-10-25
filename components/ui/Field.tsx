import type { ComponentProps, ReactNode } from "react";

type Common = { label: string; name: string; error?: string; hint?: string; required?: boolean };

function Wrapper({ id, label, error, hint, required, children }: Common & { id: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="label block text-muted">
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-red-800" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function describedBy(id: string, error?: string, hint?: string) {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
}

export function TextField({ label, name, error, hint, required, ...props }: Common & Omit<ComponentProps<"input">, "name">) {
  const id = props.id ?? `f-${name}`;
  return (
    <Wrapper id={id} name={name} label={label} error={error} hint={hint} required={required}>
      <input
        id={id}
        name={name}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className="field"
        {...props}
      />
    </Wrapper>
  );
}

export function TextArea({ label, name, error, hint, required, ...props }: Common & Omit<ComponentProps<"textarea">, "name">) {
  const id = props.id ?? `f-${name}`;
  return (
    <Wrapper id={id} name={name} label={label} error={error} hint={hint} required={required}>
      <textarea
        id={id}
        name={name}
        required={required}
        rows={5}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className="field"
        {...props}
      />
    </Wrapper>
  );
}

export function SelectField({
  label,
  name,
  error,
  hint,
  required,
  options,
  ...props
}: Common & Omit<ComponentProps<"select">, "name"> & { options: { value: string; label: string }[] }) {
  const id = props.id ?? `f-${name}`;
  return (
    <Wrapper id={id} name={name} label={label} error={error} hint={hint} required={required}>
      <select
        id={id}
        name={name}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className="field"
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Wrapper>
  );
}

