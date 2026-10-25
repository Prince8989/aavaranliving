import type { Metadata, Viewport } from "next";
import "./globals.css";
import { sans, serif } from "./fonts";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: "AAVARAN — The Art of Belonging", template: "%s | AAVARAN" },
  description:
    "Premium Indian heritage carpets with contemporary international appeal. AAVARAN — A House of MATRIKAVA GLOBAL. Rooted in India. Crafted for the World.",
  applicationName: "AAVARAN",
  openGraph: {
    type: "website",
    siteName: "AAVARAN",
    locale: "en_GB",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "AAVARAN — The Art of Belonging" }],
  },
  twitter: { card: "summary_large_image" },
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#241C18",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`} suppressHydrationWarning>
      <head>
        {/* Enables reveal animations only when JS runs; content stays visible otherwise. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
