import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "outline" | "light" | "ghost" | "outline-light";

const base =
  "inline-flex items-center justify-center gap-2 px-7 py-3.5 text-[0.75rem] font-medium uppercase tracking-[0.18em] transition-colors duration-300 ease-luxe disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-obsidian text-ivory hover:bg-walnut",
  outline: "border border-obsidian text-obsidian hover:bg-obsidian hover:text-ivory",
  light: "bg-ivory text-obsidian hover:bg-sandstone",
  "outline-light": "border border-ivory/70 text-ivory hover:bg-ivory hover:text-obsidian",
  ghost: "px-0 py-1 text-obsidian underline-offset-[6px] hover:underline",
};

export function buttonClass(variant: Variant = "primary", extra = "") {
  return `${base} ${variants[variant]} ${extra}`;
}

export function Button({ variant = "primary", className = "", ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={buttonClass(variant, className)} {...props} />;
}

export function ButtonLink({
  href,
  variant = "primary",
  className = "",
  children,
}: {
  href: string;
  variant?: Variant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, className)}>
      {children}
    </Link>
  );
}
