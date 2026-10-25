import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { getProducts } from "@/lib/supabase";
import { getCurrency } from "@/lib/server-currency";

export const revalidate = 60;

export default async function HomePage() {
  const [products, currency] = await Promise.all([getProducts(), getCurrency()]);

  return (
    <>
      <section className="py-16 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-clay">Handcrafted in India</p>
        <h1 className="mx-auto mt-4 max-w-3xl font-serif text-5xl leading-tight md:text-6xl">
          Rugs that make a house feel like home
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-stone">
          Hand-knotted and handwoven by artisan families, shipped directly to your door in the US and Europe.
        </p>
        <Link href="/shop" className="mt-8 inline-block rounded bg-ink px-8 py-3 text-sand hover:bg-clay">
          Shop the collection
        </Link>
      </section>

      <section className="py-10">
        <h2 className="mb-6 font-serif text-3xl">New arrivals</h2>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {products.slice(0, 6).map((p) => (
            <ProductCard key={p.id} product={p} currency={currency} />
          ))}
        </div>
      </section>
    </>
  );
}
