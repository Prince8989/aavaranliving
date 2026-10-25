import type { Metadata } from "next";
import { ContactForm } from "@/components/forms/ContactForm";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact AAVARAN for general enquiries, order assistance, product questions, design collaborations and trade.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className="container-site py-24 lg:py-32">
      <SectionHeading as="h1" eyebrow="Contact" title="We'd be glad to hear from you" intro="For orders, products, design collaborations or trade enquiries, write to us and we'll reply personally." />
      <div className="mx-auto mt-20 grid max-w-6xl gap-16 lg:grid-cols-[1fr_2fr]">
        <aside className="space-y-8 text-sm">
          <div>
            <h2 className="label mb-3 text-walnut">Email</h2>
            {site.supportEmail ? (
              <a href={`mailto:${site.supportEmail}`} className="underline underline-offset-4">
                {site.supportEmail}
              </a>
            ) : (
              <p className="text-muted">Please use the form — we&apos;ll reply by email.</p>
            )}
          </div>
          {site.legalAddress && (
            <div>
              <h2 className="label mb-3 text-walnut">Address</h2>
              <p className="whitespace-pre-line text-muted">{site.legalAddress}</p>
            </div>
          )}
          <div>
            <h2 className="label mb-3 text-walnut">Trade &amp; interior designers</h2>
            <p className="leading-relaxed text-muted">Architects, designers, hoteliers and developers are welcome to enquire about trade arrangements and project work.</p>
          </div>
        </aside>
        <ContactForm />
      </div>
    </div>
  );
}
