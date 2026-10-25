"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { NAV } from "./nav";
import { CurrencySelector } from "./CurrencySelector";
import { useCart } from "@/components/cart/CartProvider";

function Logo({ light }: { light?: boolean }) {
  return (
    <Link href="/" className="group flex flex-col items-center leading-none" aria-label="AAVARAN — home">
      <span className={`font-serif text-[1.65rem] tracking-[0.32em] sm:text-3xl ${light ? "text-ivory" : "text-ink"}`}>AAVARAN</span>
      <span className={`mt-1 text-[0.55rem] uppercase tracking-[0.35em] ${light ? "text-gold" : "text-walnut"}`}>A House of Matrikava Global</span>
    </Link>
  );
}

function Icon({ d, label }: { d: string; label: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true" focusable="false">
      <title>{label}</title>
      <path d={d} />
    </svg>
  );
}
const ICONS = {
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-4.35-4.35",
  account: "M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm-8 9c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5",
  bag: "M5 8h14l-1.2 12.2a1 1 0 0 1-1 .8H7.2a1 1 0 0 1-1-.8L5 8Zm3.5 0V6.5a3.5 3.5 0 0 1 7 0V8",
  menu: "M3 7h18M3 12h18M3 17h18",
};

export function Header() {
  const pathname = usePathname();
  const transparentOnTop = pathname === "/";
  const router = useRouter();
  const { cart, open } = useCart();
  const menuRef = useRef<HTMLDialogElement>(null);
  const searchRef = useRef<HTMLDialogElement>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    menuRef.current?.close();
    searchRef.current?.close();
  }, [pathname]);

  const overlay = transparentOnTop && !scrolled;
  const iconBtn = `p-2 transition-colors ${overlay ? "text-ivory hover:text-gold" : "text-ink hover:text-walnut"}`;

  return (
    <header
      className={`sticky top-0 z-40 transition-colors duration-500 ${
        overlay ? "on-dark border-b border-transparent bg-transparent" : "border-b border-ink/10 bg-ivory/95 backdrop-blur"
      }`}
    >
      <div className="container-site grid h-20 grid-cols-[1fr_auto_1fr] items-center">
        <div className="flex items-center gap-1">
          <button type="button" className={`${iconBtn} lg:hidden`} aria-label="Open menu" onClick={() => menuRef.current?.showModal()}>
            <Icon d={ICONS.menu} label="Menu" />
          </button>
          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex gap-7">
              {NAV.slice(1, 5).map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={pathname === item.href ? "page" : undefined}
                    className={`label transition-colors ${overlay ? "text-ivory/90 hover:text-gold" : "text-ink/80 hover:text-walnut"} aria-[current=page]:underline aria-[current=page]:underline-offset-8`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <Logo light={overlay} />

        <div className="flex items-center justify-end gap-1 sm:gap-2">
          <nav aria-label="Secondary" className="mr-4 hidden xl:block">
            <ul className="flex gap-7">
              {NAV.slice(5).map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className={`label transition-colors ${overlay ? "text-ivory/90 hover:text-gold" : "text-ink/80 hover:text-walnut"}`}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="hidden sm:block">
            <CurrencySelector light={overlay} />
          </div>
          <button type="button" className={iconBtn} aria-label="Search" onClick={() => searchRef.current?.showModal()}>
            <Icon d={ICONS.search} label="Search" />
          </button>
          <Link href="/account" className={`${iconBtn} hidden sm:block`} aria-label="Account">
            <Icon d={ICONS.account} label="Account" />
          </Link>
          <button type="button" className={`${iconBtn} relative`} onClick={open} aria-label={`Shopping bag, ${cart.count} item${cart.count === 1 ? "" : "s"}`} data-testid="bag-button">
            <Icon d={ICONS.bag} label="Bag" />
            {cart.count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-walnut px-1 text-[0.6rem] text-ivory" aria-hidden="true">
                {cart.count}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile navigation */}
      <dialog ref={menuRef} className="drawer from-left" aria-label="Menu" onClick={(e) => e.target === e.currentTarget && menuRef.current?.close()}>
        <div className="flex h-full flex-col px-8 py-6">
          <div className="flex items-center justify-between">
            <span className="font-serif text-2xl tracking-[0.3em]">AAVARAN</span>
            <button type="button" className="p-2 text-2xl" aria-label="Close menu" onClick={() => menuRef.current?.close()}>
              ×
            </button>
          </div>
          <nav aria-label="Mobile" className="mt-12">
            <ul className="space-y-6">
              {NAV.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="font-serif text-3xl" aria-current={pathname === item.href ? "page" : undefined}>
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/account" className="font-serif text-3xl">
                  Account
                </Link>
              </li>
            </ul>
          </nav>
          <div className="mt-auto border-t border-ink/10 pt-6">
            <CurrencySelector />
          </div>
        </div>
      </dialog>

      {/* Search */}
      <dialog
        ref={searchRef}
        aria-label="Search"
        className="mt-24 w-[min(92vw,40rem)] bg-ivory p-0 backdrop:bg-obsidian/50"
        onClick={(e) => e.target === e.currentTarget && searchRef.current?.close()}
      >
        <form
          role="search"
          className="flex items-center gap-3 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            const q = new FormData(e.currentTarget).get("q")?.toString().trim();
            searchRef.current?.close();
            router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
          }}
        >
          <label htmlFor="site-search" className="sr-only">
            Search carpets
          </label>
          <input id="site-search" name="q" type="search" placeholder="Search carpets, colours, materials…" className="field border-0 bg-transparent text-lg" autoFocus />
          <button type="submit" className="label px-3 py-2">
            Search
          </button>
        </form>
      </dialog>
    </header>
  );
}
