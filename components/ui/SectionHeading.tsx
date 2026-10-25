import type { ReactNode } from "react";

export function SectionHeading({
  eyebrow,
  title,
  intro,
  align = "center",
  dark = false,
  as: Tag = "h2",
}: {
  eyebrow?: string;
  title: ReactNode;
  intro?: ReactNode;
  align?: "center" | "left";
  dark?: boolean;
  as?: "h1" | "h2";
}) {
  return (
    <div className={`${align === "center" ? "mx-auto text-center" : ""} max-w-3xl`}>
      {eyebrow && <p className={`label mb-5 ${dark ? "text-gold" : "text-walnut"}`}>{eyebrow}</p>}
      <Tag className={`text-4xl leading-[1.1] sm:text-5xl lg:text-[3.5rem] ${dark ? "text-ivory" : "text-ink"}`}>{title}</Tag>
      {intro && <div className={`mt-6 text-[1.0625rem] leading-relaxed ${dark ? "text-sandstone/90" : "text-muted"}`}>{intro}</div>}
    </div>
  );
}
