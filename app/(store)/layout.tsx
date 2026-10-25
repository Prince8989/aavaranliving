import { cookies } from "next/headers";
import { CartProvider } from "@/components/cart/CartProvider";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ConsentBanner } from "@/components/consent/ConsentBanner";
import { CART_COOKIE, loadCart } from "@/lib/cart";
import { getContent } from "@/lib/content";
import { getCurrency, getShipCountry } from "@/lib/preferences";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [currency, shipCountry, announcement] = await Promise.all([getCurrency(), getShipCountry(), getContent("announcement")]);
  const cart = await loadCart((await cookies()).get(CART_COOKIE)?.value ?? null, currency, shipCountry);

  return (
    <CartProvider initial={cart}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-ivory focus:px-4 focus:py-2">
        Skip to content
      </a>
      <div className="on-dark bg-obsidian py-2.5 text-center">
        <p className="label text-sandstone/90">{announcement.text}</p>
      </div>
      <Header />
      <main id="main">{children}</main>
      <Footer />
      <CartDrawer />
      <ConsentBanner gaId={process.env.NEXT_PUBLIC_GA4_ID} pixelId={process.env.NEXT_PUBLIC_META_PIXEL_ID} />
    </CartProvider>
  );
}
