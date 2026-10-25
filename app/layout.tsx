import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";
import { Header } from "@/components/Header";
import { getCurrency } from "@/lib/server-currency";

const serif = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-serif" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: { default: "Aavaran Living — Handcrafted Rugs", template: "%s | Aavaran Living" },
  description: "Hand-knotted and handwoven rugs, crafted by artisans in India and shipped to the US and Europe.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://aavaranliving.com"),
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const currency = await getCurrency();
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body>
        <CartProvider currency={currency}>
          <Header />
          <main className="mx-auto min-h-[70vh] max-w-6xl px-4 py-10">{children}</main>
          <footer className="border-t border-stone/20 py-8 text-center text-sm text-stone">
            © {new Date().getFullYear()} Aavaran Living. Handcrafted in India. Shipping to the US &amp; Europe.
          </footer>
        </CartProvider>
      </body>
    </html>
  );
}
