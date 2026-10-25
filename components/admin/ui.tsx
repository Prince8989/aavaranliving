import Link from "next/link";
import type { ReactNode } from "react";

export function PageTitle({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
      <h1 className="font-serif text-4xl">{title}</h1>
      {actions}
    </div>
  );
}

export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto border border-ink/10 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-sandstone/40 text-xs uppercase tracking-wider text-muted">
          <tr>
            {head.map((h) => (
              <th key={h} scope="col" className="px-4 py-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink/10">{children}</tbody>
      </table>
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "warn" | "bad" }) {
  const tones = {
    neutral: "bg-sandstone/60 text-ink",
    good: "bg-emerald-100 text-emerald-900",
    warn: "bg-amber-100 text-amber-900",
    bad: "bg-red-100 text-red-900",
  };
  return <span className={`inline-block px-2 py-0.5 text-xs ${tones[tone]}`}>{children}</span>;
}

export function AdminLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="label bg-obsidian px-4 py-2.5 text-ivory hover:bg-walnut">
      {children}
    </Link>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="border border-ink/10 bg-white p-5">
      <p className="label text-muted">{label}</p>
      <p className="mt-2 font-serif text-3xl">{value}</p>
    </div>
  );
}

export const inputCls = "w-full border border-ink/25 bg-white px-3 py-2 text-sm focus:border-walnut focus:outline-none";
export const labelCls = "mb-1 block text-xs font-medium uppercase tracking-wider text-muted";
