import Link from "next/link";
import { site } from "@/lib/site";
import { NewsletterForm } from "@/components/forms/NewsletterForm";
import { CurrencySelector } from "./CurrencySelector";
import { ConsentSettingsLink } from "@/components/consent/ConsentBanner";

const COLS = [
  {
    title: "Collections",
    links: [
      { href: "/collections/the-earth-collection", label: "The Earth Collection" },
      { href: "/collections/the-heritage-collection", label: "The Heritage Collection" },
      { href: "/collections/the-form-collection", label: "The Form Collection" },
      { href: "/collections/the-signature-collection", label: "The Signature Collection" },
      { href: "/collections/all", label: "All Carpets" },
    ],
  },
  {
    title: "The House",
    links: [
      { href: "/our-story", label: "Our Story" },
      { href: "/the-craft", label: "The Craft" },
      { href: "/journal", label: "Journal" },
      { href: "/bespoke", label: "Bespoke" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    title: "Client Care",
    links: [
      { href: "/policies/shipping", label: "Shipping Policy" },
      { href: "/policies/returns", label: "Return Policy" },
      { href: "/policies/privacy", label: "Privacy Policy" },
      { href: "/policies/terms", label: "Terms and Conditions" },
      { href: "/account", label: "Account" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="on-dark bg-obsidian text-sandstone">
      <div className="container-site grid gap-14 py-20 lg:grid-cols-[1.2fr_2fr]">
        <div>
          <p className="font-serif text-4xl tracking-[0.3em] text-ivory">AAVARAN</p>
          <p className="mt-2 font-serif text-xl text-gold">{site.devanagari}</p>
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-sandstone/80">
            {site.tagline} {site.statement}
          </p>
          <p className="label mt-6 text-gold">
            A House of{" "}
            <a href={site.parentUrl} className="underline-offset-4 hover:underline" rel="noopener">
              {site.parent}
            </a>
          </p>
          <div className="mt-10 max-w-sm">
            <NewsletterForm dark />
          </div>
        </div>
        <div className="grid gap-10 sm:grid-cols-3">
          {COLS.map((col) => (
            <div key={col.title}>
              <h2 className="label mb-5 text-gold">{col.title}</h2>
              <ul className="space-y-3 text-sm">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sandstone/85 transition-colors hover:text-ivory">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-sandstone/15">
        <div className="container-site flex flex-col items-start justify-between gap-4 py-6 text-xs text-sandstone/70 sm:flex-row sm:items-center">
          <p>
            © {new Date().getFullYear()} {site.legalName ?? `AAVARAN · ${site.parent}`}. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-5">
            {site.social.instagram && (
              <a href={site.social.instagram} rel="noopener" className="hover:text-ivory">
                Instagram
              </a>
            )}
            {site.social.pinterest && (
              <a href={site.social.pinterest} rel="noopener" className="hover:text-ivory">
                Pinterest
              </a>
            )}
            <ConsentSettingsLink />
            <CurrencySelector light />
          </div>
        </div>
      </div>
    </footer>
  );
}
